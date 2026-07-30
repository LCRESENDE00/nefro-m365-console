import { Router } from 'express'
import { listarContas } from '../consultas.js'
import { lerConfiguracoes } from '../db.js'

export const rotasArmazenamento = Router()

/** GET /api/armazenamento - ocupacao do OneDrive por conta e por setor. */
rotasArmazenamento.get('/', async (_req, res) => {
  const contas = await listarContas()
  const config = await lerConfiguracoes()
  const quotaGb = Number(config.quotaTenantGb ?? 1024)

  const totalGb = contas.reduce((soma, c) => soma + c.oneDriveGb, 0)
  const maiores = [...contas].sort((a, b) => b.oneDriveGb - a.oneDriveGb).slice(0, 12)

  const porSetor: Record<string, number> = {}
  for (const conta of contas) porSetor[conta.depto] = (porSetor[conta.depto] ?? 0) + conta.oneDriveGb

  res.json({
    quotaGb,
    totalGb,
    totalArquivos: contas.reduce((soma, c) => soma + c.arquivos, 0),
    gbEmContasInativas: contas
      .filter((c) => c.status === 'inativo')
      .reduce((soma, c) => soma + c.oneDriveGb, 0),
    maiores: maiores.map((c) => ({
      nome: c.nome,
      upn: c.upn,
      oneDriveGb: c.oneDriveGb,
      status: c.status,
    })),
    porSetor: Object.entries(porSetor)
      .map(([setor, gb]) => ({ setor, gb }))
      .sort((a, b) => b.gb - a.gb)
      .slice(0, 6),
  })
})
