import { Router } from 'express'
import { listarContas, serieDoTenant } from '../consultas.js'
import { lerLimiares } from '../db.js'
import { contaOciosa } from '../dominio.js'

export const rotasMetricas = Router()

/** GET /api/metricas/visao-geral - tudo que a tela inicial precisa, em uma chamada. */
rotasMetricas.get('/visao-geral', async (_req, res) => {
  const contas = await listarContas()
  const limiares = await lerLimiares()
  const pessoas = contas.filter((c) => c.diasUltimoAcesso !== null)

  const desperdicioPorSku: Record<string, { curto: string; cor: string; valor: number }> = {}
  let desperdicioTotal = 0
  for (const conta of contas) {
    if (!contaOciosa(conta.status)) continue
    const atual = desperdicioPorSku[conta.sku.codigo] ?? { curto: conta.sku.curto, cor: conta.sku.cor, valor: 0 }
    atual.valor += conta.sku.preco
    desperdicioPorSku[conta.sku.codigo] = atual
    desperdicioTotal += conta.sku.preco
  }

  const noIntervalo = (min: number, max: number) =>
    contas.filter((c) => c.diasUltimoAcesso !== null && c.diasUltimoAcesso > min && c.diasUltimoAcesso <= max).length

  res.json({
    limiares,
    totalContas: contas.length,
    ativos: contas.filter((c) => c.status === 'ativo').length,
    ociosos: contas.filter((c) => c.status === 'ocioso').length,
    inativos: contas.filter((c) => c.status === 'inativo' || c.status === 'nunca').length,
    semMfa: pessoas.filter((c) => !c.mfa).length,
    totalPessoas: pessoas.length,
    desperdicioTotal,
    desperdicioPorSku: Object.entries(desperdicioPorSku)
      .map(([codigo, d]) => ({ codigo, ...d }))
      .sort((a, b) => b.valor - a.valor),
    serieAcessos: await serieDoTenant(),
    distribuicaoAcesso: [
      { faixa: '0–30 dias', valor: noIntervalo(-1, 30), cor: '#3FBFA8' },
      { faixa: '31–60', valor: noIntervalo(30, 60), cor: '#E0A44A' },
      { faixa: '61–90', valor: noIntervalo(60, 90), cor: '#E0A44A' },
      { faixa: '90+', valor: contas.filter((c) => (c.diasUltimoAcesso ?? 0) > 90).length, cor: '#F2657A' },
      { faixa: 'nunca', valor: contas.filter((c) => c.diasUltimoAcesso === null).length, cor: '#4a5162' },
    ],
    precisamRevisao: contas
      .filter((c) => contaOciosa(c.status))
      .sort((a, b) => (b.diasUltimoAcesso ?? 9999) - (a.diasUltimoAcesso ?? 9999))
      .slice(0, 6),
  })
})
