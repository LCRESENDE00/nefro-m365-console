import { RELATORIOS, dataArquivo, paraCsv, planilhaSelecao, type Planilha } from '@nefro/dominio'
import { Router } from 'express'
import { listarContas, listarSkus } from '../consultas.js'
import { lerConfiguracoes, prisma } from '../db.js'

export const rotasRelatorios = Router()

/** Nome que aparece na coluna "Gerado por" do historico. */
async function autor() {
  const config = await lerConfiguracoes()
  return config.contaConectada?.split('@')[0]?.replace('.', ' ') ?? 'console'
}

async function responderCsv(res: import('express').Response, arquivo: string, planilha: Planilha) {
  await prisma.exportacao.create({
    data: { arquivo, geradoPor: await autor(), linhas: planilha.linhas.length },
  })

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${arquivo}"`)
  res.setHeader('X-Nome-Arquivo', arquivo)
  res.send(paraCsv(planilha.cabecalho, planilha.linhas))
}

/** GET /api/relatorios - catalogo das exportacoes disponiveis + historico. */
rotasRelatorios.get('/', async (_req, res) => {
  const config = await lerConfiguracoes()
  res.json({
    disponiveis: Object.entries(RELATORIOS).map(([tipo, r]) => ({ tipo, titulo: r.titulo })),
    historico: await prisma.exportacao.findMany({ orderBy: { criadoEm: 'desc' }, take: 12 }),
    envioAutomatico: {
      resumoMensal: config.resumoMensal === 'true',
      alertaContaInativa: config.alertaContaInativa === 'true',
      copiaPastaTI: config.copiaPastaTI === 'true',
      destinatario: config.contaConectada ?? '',
    },
  })
})

/**
 * POST /api/relatorios/:tipo - gera o CSV de verdade a partir do banco,
 * registra a exportacao no historico e devolve o arquivo para download.
 */
rotasRelatorios.post('/:tipo', async (req, res) => {
  const relatorio = RELATORIOS[req.params.tipo]
  if (!relatorio) return res.status(404).json({ erro: 'Relatório desconhecido' })

  const [contas, skus] = await Promise.all([listarContas(), listarSkus()])
  await responderCsv(res, `${req.params.tipo}-${dataArquivo()}.csv`, relatorio.montar(contas, skus))
})

/** POST /api/relatorios/selecao/usuarios - exporta exatamente o filtro da tela de Usuarios. */
rotasRelatorios.post('/selecao/usuarios', async (req, res) => {
  const upns: string[] = Array.isArray(req.body?.upns) ? req.body.upns : []
  const contas = (await listarContas()).filter((c) => upns.includes(c.upn))
  await responderCsv(res, `usuarios-filtrados-${dataArquivo()}.csv`, planilhaSelecao(contas))
})
