import { calcularArmazenamento } from '@nefro/dominio'
import { Router } from 'express'
import { listarContas } from '../consultas.js'
import { lerConfiguracoes } from '../db.js'

export const rotasArmazenamento = Router()

/** GET /api/armazenamento - ocupacao do OneDrive por conta e por setor. */
rotasArmazenamento.get('/', async (_req, res) => {
  const [contas, config] = await Promise.all([listarContas(), lerConfiguracoes()])
  res.json(calcularArmazenamento(contas, Number(config.quotaTenantGb ?? 1024)))
})
