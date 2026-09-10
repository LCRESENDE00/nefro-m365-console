import { SETORES } from '@nefro/dominio'
import { useSyncExternalStore } from 'react'

/**
 * Catálogos padrão da Nefroclínicas — unidades (sigla, nome, região) e setores.
 *
 * São as listas suspensas do cadastro de conta e dos filtros: quem cadastra escolhe
 * de uma lista fechada, então a sigla da unidade e o nome do setor saem sempre iguais
 * (nada de "NCBHZ", "ncbhz " e "NC-BHZ" para a mesma unidade).
 *
 * A lista é editada em Configurações e fica salva neste navegador (localStorage), como o
 * tema. Sem nada salvo, valem os padrões abaixo. "Restaurar padrão" volta para eles.
 */
export type Unidade = {
  /** Sigla exatamente como vai para o campo `department` do Entra (ex.: NCBHZ). */
  sigla: string
  /** Nome amigável mostrado ao lado da sigla (ex.: Belo Horizonte). */
  nome: string
  /** Região usada no filtro "Todas as regiões" da tela de Usuários. */
  regiao: string
}

export type Catalogos = {
  unidades: Unidade[]
  setores: string[]
}

export const CHAVE_CATALOGOS = 'nefrocontrol:catalogos'

/** Unidades da rede como estão no Entra; nome e região são editáveis em Configurações. */
export const UNIDADES_PADRAO: Unidade[] = [
  { sigla: 'NCBHZ', nome: 'Belo Horizonte', regiao: 'Minas Gerais' },
  { sigla: 'NCGVA', nome: 'Governador Valadares', regiao: 'Minas Gerais' },
  { sigla: 'NCIPA', nome: 'Ipatinga', regiao: 'Minas Gerais' },
  { sigla: 'NCBSB', nome: 'Brasília', regiao: 'Distrito Federal' },
  { sigla: 'NCBSB2', nome: 'Brasília 2', regiao: 'Distrito Federal' },
  { sigla: 'NCSP', nome: 'São Paulo', regiao: 'São Paulo' },
  { sigla: 'NCNIT', nome: 'Niterói', regiao: 'Rio de Janeiro' },
  { sigla: 'NCVRD', nome: 'Volta Redonda', regiao: 'Rio de Janeiro' },
  { sigla: 'NCCWB', nome: 'Curitiba', regiao: 'Paraná' },
  { sigla: 'NCREC', nome: 'Recife', regiao: 'Pernambuco' },
  { sigla: 'NCSLZ', nome: 'São Luís', regiao: 'Maranhão' },
]

export const SETORES_PADRAO: string[] = [...SETORES]

export const CATALOGOS_PADRAO: Catalogos = { unidades: UNIDADES_PADRAO, setores: SETORES_PADRAO }

/** Sigla normalizada: maiúscula, sem espaços nas pontas. */
export const normalizarSigla = (sigla: string) => sigla.trim().toUpperCase()

function lerSalvo(): Catalogos {
  try {
    const bruto = localStorage.getItem(CHAVE_CATALOGOS)
    if (!bruto) return CATALOGOS_PADRAO
    const salvo = JSON.parse(bruto) as Partial<Catalogos>
    const unidades = Array.isArray(salvo.unidades)
      ? salvo.unidades
          .filter((u) => u && typeof u.sigla === 'string' && u.sigla.trim())
          .map((u) => ({ sigla: normalizarSigla(u.sigla), nome: String(u.nome ?? '').trim(), regiao: String(u.regiao ?? '').trim() }))
      : UNIDADES_PADRAO
    const setores = Array.isArray(salvo.setores)
      ? salvo.setores.map((s) => String(s).trim()).filter(Boolean)
      : SETORES_PADRAO
    return { unidades, setores }
  } catch {
    return CATALOGOS_PADRAO
  }
}

let catalogosAtuais: Catalogos = lerSalvo()
const ouvintes = new Set<() => void>()

export const lerCatalogos = () => catalogosAtuais

export function definirCatalogos(novos: Catalogos) {
  catalogosAtuais = {
    unidades: novos.unidades.map((u) => ({ ...u, sigla: normalizarSigla(u.sigla), nome: u.nome.trim(), regiao: u.regiao.trim() })),
    setores: novos.setores.map((s) => s.trim()).filter(Boolean),
  }
  try {
    localStorage.setItem(CHAVE_CATALOGOS, JSON.stringify(catalogosAtuais))
  } catch {
    // Sem localStorage a lista vale só até recarregar a página.
  }
  ouvintes.forEach((ouvinte) => ouvinte())
}

export const restaurarCatalogosPadrao = () => definirCatalogos(CATALOGOS_PADRAO)

/** Adiciona (ou atualiza, se a sigla já existir) uma unidade. */
export function salvarUnidade(unidade: Unidade) {
  const sigla = normalizarSigla(unidade.sigla)
  if (!sigla) return
  const atuais = catalogosAtuais.unidades
  const existe = atuais.some((u) => u.sigla === sigla)
  definirCatalogos({
    ...catalogosAtuais,
    unidades: existe
      ? atuais.map((u) => (u.sigla === sigla ? { ...unidade, sigla } : u))
      : [...atuais, { ...unidade, sigla }].sort((a, b) => a.sigla.localeCompare(b.sigla)),
  })
}

export function removerUnidade(sigla: string) {
  definirCatalogos({ ...catalogosAtuais, unidades: catalogosAtuais.unidades.filter((u) => u.sigla !== normalizarSigla(sigla)) })
}

export function adicionarSetor(setor: string) {
  const limpo = setor.trim()
  if (!limpo) return
  if (catalogosAtuais.setores.some((s) => s.toLowerCase() === limpo.toLowerCase())) return
  definirCatalogos({
    ...catalogosAtuais,
    setores: [...catalogosAtuais.setores, limpo].sort((a, b) => a.localeCompare(b, 'pt-BR')),
  })
}

export function removerSetor(setor: string) {
  definirCatalogos({ ...catalogosAtuais, setores: catalogosAtuais.setores.filter((s) => s !== setor) })
}

/** Unidade do catálogo pela sigla (ignora maiúsculas/minúsculas e espaços). */
export function unidadePorSigla(sigla: string | null | undefined): Unidade | undefined {
  const codigo = normalizarSigla(sigla ?? '')
  return codigo ? catalogosAtuais.unidades.find((u) => u.sigla === codigo) : undefined
}

/** "NCBHZ · Belo Horizonte" quando a unidade está no catálogo; só a sigla quando não está. */
export function descreverUnidade(sigla: string | null | undefined): string {
  const unidade = unidadePorSigla(sigla)
  return unidade && unidade.nome ? `${unidade.sigla} · ${unidade.nome}` : (sigla ?? '').trim()
}

/** Regiões já usadas, para sugerir ao cadastrar uma unidade nova. */
export const regioesDoCatalogo = () =>
  [...new Set(catalogosAtuais.unidades.map((u) => u.regiao).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'))

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte)
  return () => ouvintes.delete(ouvinte)
}

/** Catálogos atuais; qualquer tela que usar fica em sincronia quando Configurações muda a lista. */
export function useCatalogos() {
  const catalogos = useSyncExternalStore(assinar, () => catalogosAtuais, () => CATALOGOS_PADRAO)
  return { catalogos, salvarUnidade, removerUnidade, adicionarSetor, removerSetor, restaurarCatalogosPadrao, definirCatalogos }
}
