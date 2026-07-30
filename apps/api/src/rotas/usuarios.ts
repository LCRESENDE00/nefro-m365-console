import { Router } from 'express'
import { listarContas, serieDoUsuario } from '../consultas.js'
import { prisma } from '../db.js'
import { contaOciosa } from '../dominio.js'

export const rotasUsuarios = Router()

type Ordenacao = 'nome' | 'dias' | 'gb'

/**
 * GET /api/usuarios?q=&depto=&status=&sort=&dir=
 * Devolve as contas ja filtradas e ordenadas, mais os agregados que o rodape
 * da tabela mostra (total e custo ocioso da selecao atual).
 */
rotasUsuarios.get('/', async (req, res) => {
  const { q = '', depto = 'todos', status = 'todos' } = req.query as Record<string, string>
  const sort = (req.query.sort as Ordenacao) ?? 'dias'
  const dir = Number(req.query.dir ?? -1) < 0 ? -1 : 1

  const todas = await listarContas()
  const busca = q.trim().toLowerCase()

  const contas = todas
    .filter((c) => {
      if (status !== 'todos' && c.status !== status) return false
      if (depto !== 'todos' && c.depto !== depto) return false
      if (busca && !`${c.nome}${c.upn}${c.cargo}`.toLowerCase().includes(busca)) return false
      return true
    })
    .sort((a, b) => {
      const valor = (c: (typeof todas)[number]) =>
        sort === 'dias' ? (c.diasUltimoAcesso ?? 9999) : sort === 'gb' ? c.oneDriveGb : c.nome
      const va = valor(a)
      const vb = valor(b)
      return (va > vb ? 1 : va < vb ? -1 : 0) * dir
    })

  res.json({
    contas,
    total: todas.length,
    deptos: [...new Set(todas.map((c) => c.depto))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    custoSelecao: contas.filter((c) => contaOciosa(c.status)).reduce((soma, c) => soma + c.sku.preco, 0),
  })
})

/** GET /api/usuarios/:upn - detalhe da conta com a serie de acessos do drawer. */
rotasUsuarios.get('/:upn', async (req, res) => {
  const contas = await listarContas()
  const conta = contas.find((c) => c.upn === req.params.upn)
  if (!conta) return res.status(404).json({ erro: 'Conta não encontrada' })

  res.json({ ...conta, serieAcessos: await serieDoUsuario(conta.id) })
})

/**
 * POST /api/usuarios/:upn/revisao - marca a conta para revisao.
 * O console e somente leitura no Graph; a marcacao vive so no banco local.
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
