import { calcularLicencas } from '@nefro/dominio'
import { Router } from 'express'
import { listarContas, listarSkus } from '../consultas.js'

export const rotasLicencas = Router()

/** GET /api/licencas - assentos contratados x atribuidos x em uso, por plano. */
rotasLicencas.get('/', async (_req, res) => {
  const [skus, contas] = await Promise.all([listarSkus(), listarContas()])
  res.json(calcularLicencas(contas, skus))
})
