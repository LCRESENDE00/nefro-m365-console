import {
  filtrarContas,
  senhaTemporaria,
  serieDoUsuario,
  validarCadastro,
  type Cadastro,
  type FiltroContas,
} from '@nefro/dominio'
import { Router } from 'express'
import { listarContas, serieDeAcessos } from '../consultas.js'
import { prisma } from '../db.js'

export const rotasUsuarios = Router()

/** Le do corpo so os campos do cadastro, ja com os tipos certos. */
function lerCadastro(corpo: unknown): Partial<Cadastro> {
  const entrada = (corpo ?? {}) as Record<string, unknown>
  const dados: Record<string, unknown> = {}

  const texto = (campo: keyof Cadastro) => {
    if (campo in entrada) dados[campo] = String(entrada[campo] ?? '').trim()
  }

  for (const campo of [
    'nome',
    'upn',
    'cargo',
    'depto',
    'unidade',
    'cnpj',
    'skuCodigo',
    'classificacao',
    'regime',
    'tipoLicenca',
    'produto',
    'tipoContrato',
  ] as const) {
    texto(campo)
  }

  if ('dataRenovacao' in entrada) {
    dados.dataRenovacao = entrada.dataRenovacao ? String(entrada.dataRenovacao) : null
  }
  if ('valorTotal' in entrada) dados.valorTotal = Number(entrada.valorTotal)
  if ('mfa' in entrada) dados.mfa = Boolean(entrada.mfa)
  if ('ehRecurso' in entrada) dados.ehRecurso = Boolean(entrada.ehRecurso)

  return dados as Partial<Cadastro>
}

/**
 * GET /api/usuarios?q=&depto=&unidade=&tipoLicenca=&classificacao=&regime=&produto=&status=&sort=&dir=
 * Devolve as contas ja filtradas e ordenadas, mais os agregados que o rodape
 * da tabela mostra (total e custo ocioso da selecao atual).
 */
rotasUsuarios.get('/', async (req, res) => {
  const texto = (chave: keyof FiltroContas, padrao = 'todos') =>
    (req.query[chave] as string) ?? padrao

  const filtro: FiltroContas = {
    q: (req.query.q as string) ?? '',
    depto: texto('depto'),
    unidade: texto('unidade'),
    tipoLicenca: texto('tipoLicenca') as FiltroContas['tipoLicenca'],
    classificacao: texto('classificacao') as FiltroContas['classificacao'],
    regime: texto('regime') as FiltroContas['regime'],
    produto: texto('produto'),
    status: texto('status') as FiltroContas['status'],
    sort: ((req.query.sort as FiltroContas['sort']) ?? 'dias') as FiltroContas['sort'],
    dir: Number(req.query.dir ?? -1) < 0 ? -1 : 1,
  }

  res.json(filtrarContas(await listarContas(), filtro))
})

/** GET /api/usuarios/:upn - detalhe da conta com a serie de acessos do drawer. */
rotasUsuarios.get('/:upn', async (req, res) => {
  const contas = await listarContas()
  const conta = contas.find((c) => c.upn === req.params.upn)
  if (!conta) return res.status(404).json({ erro: 'Conta não encontrada' })

  res.json({ ...conta, serieAcessos: await serieDeAcessos(conta.id) })
})

/** POST /api/usuarios - cria a conta no diretorio local do console. */
rotasUsuarios.post('/', async (req, res) => {
  const dados = lerCadastro(req.body)

  const invalido = validarCadastro(dados)
  if (invalido) return res.status(400).json({ erro: invalido })

  const cadastro = dados as Cadastro

  if (await prisma.usuario.findUnique({ where: { upn: cadastro.upn } })) {
    return res.status(409).json({ erro: 'Já existe uma conta com esse e-mail' })
  }
  const sku = await prisma.sku.findUnique({ where: { codigo: cadastro.skuCodigo } })
  if (!sku) return res.status(400).json({ erro: 'Tipo de licença desconhecido' })

  const criada = await prisma.usuario.create({
    data: {
      ...cadastro,
      // Conta recem-criada ainda nao registrou login.
      diasUltimoAcesso: null,
      oneDriveGb: 0,
      arquivos: 0,
      valorTotal: cadastro.valorTotal || sku.preco,
      acessos: { create: serieDoUsuario(null).map((valor, semana) => ({ semana, valor })) },
    },
  })

  res.status(201).json({ upn: criada.upn })
})

/** PATCH /api/usuarios/:upn - edita o cadastro. O UPN identifica e nao muda. */
rotasUsuarios.patch('/:upn', async (req, res) => {
  const dados = lerCadastro(req.body)
  delete dados.upn

  if (Object.keys(dados).length === 0) {
    return res.status(400).json({ erro: 'Nenhum campo do cadastro no corpo da requisição' })
  }

  const invalido = validarCadastro(dados, true)
  if (invalido) return res.status(400).json({ erro: invalido })

  if (!(await prisma.usuario.findUnique({ where: { upn: req.params.upn } }))) {
    return res.status(404).json({ erro: 'Conta não encontrada' })
  }
  if (dados.skuCodigo && !(await prisma.sku.findUnique({ where: { codigo: dados.skuCodigo } }))) {
    return res.status(400).json({ erro: 'Tipo de licença desconhecido' })
  }

  await prisma.usuario.update({ where: { upn: req.params.upn }, data: dados })
  res.json({ upn: req.params.upn })
})

/**
 * POST /api/usuarios/:upn/senha - gera uma senha temporaria para a conta.
 * Ela vai uma unica vez na resposta; o banco guarda so a data da redefinicao.
 */
rotasUsuarios.post('/:upn/senha', async (req, res) => {
  if (!(await prisma.usuario.findUnique({ where: { upn: req.params.upn } }))) {
    return res.status(404).json({ erro: 'Conta não encontrada' })
  }

  const senha = senhaTemporaria()
  await prisma.usuario.update({
    where: { upn: req.params.upn },
    data: { senhaRedefinidaEm: new Date() },
  })

  res.json({ senha })
})

/** POST /api/usuarios/:upn/situacao - inativa a conta, ou reativa se ja estiver inativa. */
rotasUsuarios.post('/:upn/situacao', async (req, res) => {
  const usuario = await prisma.usuario.findUnique({ where: { upn: req.params.upn } })
  if (!usuario) return res.status(404).json({ erro: 'Conta não encontrada' })

  const habilitada = !usuario.habilitada
  await prisma.usuario.update({ where: { upn: usuario.upn }, data: { habilitada } })
  res.json({ habilitada })
})

/**
 * POST /api/usuarios/:upn/revisao - marca a conta para revisao.
 * E so uma marcacao de trabalho da TI: nao mexe no cadastro nem na licenca.
 */
rotasUsuarios.post('/:upn/revisao', async (req, res) => {
  const usuario = await prisma.usuario.findUnique({ where: { upn: req.params.upn } })
  if (!usuario) return res.status(404).json({ erro: 'Conta não encontrada' })

  const chave = `revisao:${usuario.upn}`
  const marcado = await prisma.configuracao.findUnique({ where: { chave } })

  if (marcado) {
    await prisma.configuracao.delete({ where: { chave } })
    return res.json({ marcada: false })
  }

  await prisma.configuracao.create({ data: { chave, valor: new Date().toISOString() } })
  res.json({ marcada: true })
})
