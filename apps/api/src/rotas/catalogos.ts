import type { Catalogos, TipoCatalogo } from '@nefro/dominio'
import { Router } from 'express'
import { prisma } from '../db.js'

export const rotasCatalogos = Router()

const TIPOS: TipoCatalogo[] = ['setor', 'unidade', 'cnpj']

const ehTipo = (valor: unknown): valor is TipoCatalogo => TIPOS.includes(valor as TipoCatalogo)

async function lerCatalogos(): Promise<Catalogos> {
  const linhas = await prisma.catalogo.findMany({ orderBy: { valor: 'asc' } })
  const doTipo = (tipo: TipoCatalogo) => linhas.filter((l) => l.tipo === tipo).map((l) => l.valor)

  return {
    setores: doTipo('setor'),
    unidades: doTipo('unidade'),
    cnpjs: doTipo('cnpj'),
  }
}

/** GET /api/catalogos - as tres listas padronizadas da area administrativa. */
rotasCatalogos.get('/', async (_req, res) => {
  res.json(await lerCatalogos())
})

/** POST /api/catalogos - inclui um valor em uma das listas. */
rotasCatalogos.post('/', async (req, res) => {
  const { tipo, valor } = (req.body ?? {}) as { tipo?: unknown; valor?: unknown }
  const texto = String(valor ?? '').trim()

  if (!ehTipo(tipo)) return res.status(400).json({ erro: 'Lista desconhecida' })
  if (!texto) return res.status(400).json({ erro: 'Informe o valor a incluir' })

  if (await prisma.catalogo.findUnique({ where: { tipo_valor: { tipo, valor: texto } } })) {
    return res.status(409).json({ erro: 'Esse valor já está na lista' })
  }

  await prisma.catalogo.create({ data: { tipo, valor: texto } })
  res.status(201).json(await lerCatalogos())
})

/**
 * DELETE /api/catalogos/:tipo/:valor - remove um valor da lista.
 * Bloqueia se alguma conta ainda usa o valor, para nao deixar cadastro orfao.
 */
rotasCatalogos.delete('/:tipo/:valor', async (req, res) => {
  const { tipo } = req.params
  const valor = decodeURIComponent(req.params.valor)
  if (!ehTipo(tipo)) return res.status(400).json({ erro: 'Lista desconhecida' })

  const campo = tipo === 'setor' ? 'depto' : tipo === 'unidade' ? 'unidade' : 'cnpj'
  const emUso = await prisma.usuario.count({ where: { [campo]: valor } })
  if (emUso > 0) {
    return res.status(409).json({
      erro: `${emUso} ${emUso === 1 ? 'conta usa' : 'contas usam'} esse valor. Altere os cadastros antes de remover.`,
    })
  }

  await prisma.catalogo.deleteMany({ where: { tipo, valor } })
  res.json(await lerCatalogos())
})
