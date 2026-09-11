import type { LicencaReal, UsuarioReal } from './graphModelos'
import type { Precos } from './precosPadrao'
import { diasParaStatus } from './status'

/**
 * Quanto a clínica economizaria removendo licenças que não estão sendo usadas.
 *
 * Duas fontes de economia:
 *  - licenças livres: contratadas e nunca atribuídas a ninguém (comprados - em uso);
 *  - licenças em contas paradas: desativadas, inativas ou que nunca acessaram.
 * As ociosas (sem acesso há pouco tempo) ficam separadas como potencial adicional,
 * porque ainda precisam de revisão antes de qualquer corte.
 */

export type MotivoRecuperacao = 'desativada' | 'nunca' | 'inativa' | 'ociosa'

export const MOTIVO: Record<MotivoRecuperacao, { rotulo: string; classe: string; certa: boolean }> = {
  desativada: { rotulo: 'Desativada', classe: 'b-bad', certa: true },
  nunca: { rotulo: 'Nunca acessou', classe: 'b-neutral', certa: true },
  inativa: { rotulo: 'Inativa', classe: 'b-bad', certa: true },
  ociosa: { rotulo: 'Ociosa', classe: 'b-warn', certa: false },
}

export type ContaRecuperavel = {
  usuario: UsuarioReal
  motivo: MotivoRecuperacao
  /** Só as licenças pagas, já com nome e valor. */
  licencas: Array<{ skuId: string; skuPartNumber: string; nome: string; preco: number | null }>
  /** Soma dos valores conhecidos; licenças sem valor informado contam zero. */
  valorMensal: number
  semValor: boolean
}

export type LinhaPlano = {
  skuId: string
  skuPartNumber: string
  nome: string
  preco: number | null
  comprados: number
  emUso: number
  livres: number
  desativadas: number
  nunca: number
  inativas: number
  ociosas: number
  /** livres + desativadas + nunca + inativas */
  recuperaveis: number
  economiaMensal: number
  /** ociosas × preço: só vira economia depois de revisar as contas */
  potencialOciosas: number
}

export type ResumoEconomia = {
  planos: LinhaPlano[]
  contas: ContaRecuperavel[]
  totalRecuperaveis: number
  totalLivres: number
  economiaMensal: number
  economiaAnual: number
  potencialOciosas: number
  contasCertas: number
  contasOciosas: number
  planosSemValor: number
}

export type Limiares = { limiarOcioso: number; limiarInativo: number }

export function motivoDaConta(u: UsuarioReal, limiares: Limiares): MotivoRecuperacao | null {
  if (!u.habilitada) return 'desativada'
  const status = diasParaStatus(u.diasUltimoAcesso, limiares.limiarOcioso, limiares.limiarInativo)
  if (status === 'nunca') return 'nunca'
  if (status === 'inativo') return 'inativa'
  if (status === 'ocioso') return 'ociosa'
  return null
}

export function calcularEconomia(
  licencas: LicencaReal[],
  usuarios: UsuarioReal[] | null,
  precos: Precos,
  limiares: Limiares,
): ResumoEconomia {
  const pagas = licencas.filter((l) => !l.provavelAutosservico)
  const porSkuId = new Map(pagas.map((l) => [l.skuId, l]))

  const linhas = new Map<string, LinhaPlano>()
  for (const l of pagas) {
    const preco = precos[l.skuPartNumber] ?? null
    linhas.set(l.skuId, {
      skuId: l.skuId,
      skuPartNumber: l.skuPartNumber,
      nome: l.nome,
      preco,
      comprados: l.comprados,
      emUso: l.emUso,
      livres: Math.max(0, l.comprados - l.emUso),
      desativadas: 0,
      nunca: 0,
      inativas: 0,
      ociosas: 0,
      recuperaveis: 0,
      economiaMensal: 0,
      potencialOciosas: 0,
    })
  }

  const contas: ContaRecuperavel[] = []
  for (const u of usuarios ?? []) {
    const pagasDaConta = u.skuIds.filter((id) => porSkuId.has(id))
    if (pagasDaConta.length === 0) continue
    const motivo = motivoDaConta(u, limiares)
    if (!motivo) continue

    let valorMensal = 0
    let semValor = false
    const licencasDaConta = pagasDaConta.map((skuId) => {
      const linha = linhas.get(skuId)!
      if (motivo === 'desativada') linha.desativadas++
      else if (motivo === 'nunca') linha.nunca++
      else if (motivo === 'inativa') linha.inativas++
      else linha.ociosas++
      if (linha.preco === null) semValor = true
      else valorMensal += linha.preco
      return { skuId, skuPartNumber: linha.skuPartNumber, nome: linha.nome, preco: linha.preco }
    })
    contas.push({ usuario: u, motivo, licencas: licencasDaConta, valorMensal, semValor })
  }

  const planos = [...linhas.values()].map((linha) => {
    const recuperaveis = linha.livres + linha.desativadas + linha.nunca + linha.inativas
    const preco = linha.preco ?? 0
    return {
      ...linha,
      recuperaveis,
      economiaMensal: recuperaveis * preco,
      potencialOciosas: linha.ociosas * preco,
    }
  })
  planos.sort((a, b) => b.economiaMensal - a.economiaMensal || b.recuperaveis - a.recuperaveis || a.nome.localeCompare(b.nome, 'pt-BR'))

  contas.sort((a, b) => {
    const certaA = MOTIVO[a.motivo].certa ? 0 : 1
    const certaB = MOTIVO[b.motivo].certa ? 0 : 1
    return certaA - certaB || b.valorMensal - a.valorMensal || (b.usuario.diasUltimoAcesso ?? 99999) - (a.usuario.diasUltimoAcesso ?? 99999)
  })

  const economiaMensal = planos.reduce((s, p) => s + p.economiaMensal, 0)
  return {
    planos,
    contas,
    totalRecuperaveis: planos.reduce((s, p) => s + p.recuperaveis, 0),
    totalLivres: planos.reduce((s, p) => s + p.livres, 0),
    economiaMensal,
    economiaAnual: economiaMensal * 12,
    potencialOciosas: planos.reduce((s, p) => s + p.potencialOciosas, 0),
    contasCertas: contas.filter((c) => MOTIVO[c.motivo].certa).length,
    contasOciosas: contas.filter((c) => !MOTIVO[c.motivo].certa).length,
    planosSemValor: planos.filter((p) => p.preco === null && p.recuperaveis + p.ociosas > 0).length,
  }
}
