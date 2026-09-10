import { UNIDADES_PADRAO, unidadePorSigla } from './catalogos'

/**
 * Região de cada unidade da Nefroclínicas.
 *
 * A Microsoft Graph só traz o código da unidade (campo `department` do Entra, ex.: NCBHZ),
 * então o agrupamento por região fica no console. A fonte é o catálogo de unidades
 * (lib/catalogos.ts), que começa com os padrões abaixo e pode ser ajustado em
 * Configurações > Unidades e setores — abrir, fechar ou mover uma unidade de região
 * não exige mexer em código.
 *
 * Chave: código da unidade exatamente como está no Entra (a comparação ignora
 * maiúsculas/minúsculas e espaços nas pontas). Valor: nome da região exibido no filtro.
 */
export const REGIAO_POR_UNIDADE: Record<string, string> = Object.fromEntries(
  UNIDADES_PADRAO.map((unidade) => [unidade.sigla, unidade.regiao]),
)

export const SEM_REGIAO = 'Sem região definida'

/** Rótulo de unidade usado nos filtros: o `department` limpo, ou um texto padrão quando vazio. */
export function rotuloUnidade(departamento: string | null | undefined): string {
  const limpo = departamento ? departamento.trim() : ''
  return limpo || 'Sem unidade definida'
}

/** Região da unidade; unidades fora do catálogo caem em "Sem região definida". */
export function regiaoDaUnidade(departamento: string | null | undefined): string {
  const codigo = departamento ? departamento.trim().toUpperCase() : ''
  if (!codigo) return SEM_REGIAO
  const noCatalogo = unidadePorSigla(codigo)
  if (noCatalogo?.regiao) return noCatalogo.regiao
  const padrao = Object.entries(REGIAO_POR_UNIDADE).find(([unidade]) => unidade.toUpperCase() === codigo)
  return padrao ? padrao[1] : SEM_REGIAO
}
