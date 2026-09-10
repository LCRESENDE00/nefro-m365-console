/**
 * Região de cada unidade da Nefroclínicas.
 *
 * A Microsoft Graph só traz o código da unidade (campo `department` do Entra, ex.: NCBHZ),
 * então o agrupamento por região fica aqui, no código. Para abrir, fechar ou mover uma
 * unidade de região basta editar este mapa — o filtro "Todas as regiões" na tela de
 * Usuários é montado a partir dele.
 *
 * Chave: código da unidade exatamente como está no Entra (a comparação ignora
 * maiúsculas/minúsculas e espaços nas pontas). Valor: nome da região exibido no filtro.
 */
export const REGIAO_POR_UNIDADE: Record<string, string> = {
  NCBHZ: 'Minas Gerais',
  NCGVA: 'Minas Gerais',
  NCIPA: 'Minas Gerais',
  NCBSB: 'Distrito Federal',
  NCBSB2: 'Distrito Federal',
  NCSP: 'São Paulo',
  NCNIT: 'Rio de Janeiro',
  NCVRD: 'Rio de Janeiro',
  NCCWB: 'Paraná',
  NCREC: 'Pernambuco',
  NCSLZ: 'Maranhão',
}

export const SEM_REGIAO = 'Sem região definida'

/** Rótulo de unidade usado nos filtros: o `department` limpo, ou um texto padrão quando vazio. */
export function rotuloUnidade(departamento: string | null | undefined): string {
  const limpo = departamento ? departamento.trim() : ''
  return limpo || 'Sem unidade definida'
}

/** Região da unidade; unidades fora do mapa caem em "Sem região definida". */
export function regiaoDaUnidade(departamento: string | null | undefined): string {
  const codigo = departamento ? departamento.trim().toUpperCase() : ''
  if (!codigo) return SEM_REGIAO
  const encontrada = Object.entries(REGIAO_POR_UNIDADE).find(([unidade]) => unidade.toUpperCase() === codigo)
  return encontrada ? encontrada[1] : SEM_REGIAO
}
