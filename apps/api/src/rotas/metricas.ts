import { calcularVisaoGeral } from '@nefro/dominio'
import { Router } from 'express'
import { listarContas, serieDoTenant } from '../consultas.js'
import { lerLimiares } from '../db.js'

export const rotasMetricas = Router()

/** GET /api/metricas/visao-geral - tudo que a tela inicial precisa, em uma chamada. */
rotasMetricas.get('/visao-geral', async (_req, res) => {
  const [contas, limiares, serie] = await Promise.all([listarContas(), lerLimiares(), serieDoTenant()])
  res.json(calcularVisaoGeral(contas, limiares, serie))
})
