import { filtrarContas, type FiltroContas } from '@nefro/dominio'
import { Router } from 'express'
import { listarContas, serieDeAcessos } from '../consultas.js'
import { prisma } from '../db.js'

export const rotasUsuarios = Router()

/**
 * GET /api/usuarios?q=&depto=&status=&sort=&dir=
 * Devolve as contas ja filtradas e ordenadas, mais os agregados que o rodape
 * da tabela mostra (total e custo ocioso da selecao atual).
 */
rotasUsuarios.get('/', async (req, res) => {
  const filtro: FiltroContas = {
    q: (req.query.q as string) ?? '',
    depto: (req.query.depto as string) ?? 'todos',
    status: (req.query.status as FiltroContas['status']) ?? 'todos',
    sort: (req.query.sort as FiltroContas['sort']) ?? 'dias',
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
