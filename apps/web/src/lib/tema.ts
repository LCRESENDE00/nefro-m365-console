import { useSyncExternalStore } from 'react'

/** Tema visual do console. O claro e o padrao (tudo branco); o escuro e opcional. */
export type Tema = 'claro' | 'escuro'

/* Mesma chave usada pelo script inline em index.html, que aplica o tema antes
   do React montar para a pagina nao piscar em branco no modo escuro. */
export const CHAVE_TEMA = 'nefrocontrol:tema'

let temaAtual: Tema = lerTemaSalvo()
const ouvintes = new Set<() => void>()

function lerTemaSalvo(): Tema {
  try {
    return localStorage.getItem(CHAVE_TEMA) === 'escuro' ? 'escuro' : 'claro'
  } catch {
    return 'claro'
  }
}

/** Grava o tema no <html data-tema> (os tokens em global.css respondem a esse atributo). */
export function aplicarTema(tema: Tema) {
  const raiz = document.documentElement
  if (tema === 'escuro') raiz.dataset.tema = 'escuro'
  else delete raiz.dataset.tema
}

// Garante o atributo no <html> mesmo se o script inline do index.html nao rodar.
aplicarTema(temaAtual)

export function definirTema(tema: Tema) {
  temaAtual = tema
  aplicarTema(tema)
  try {
    localStorage.setItem(CHAVE_TEMA, tema)
  } catch {
    // Sem localStorage (navegacao privada, por exemplo) o tema vale so ate recarregar.
  }
  ouvintes.forEach((ouvinte) => ouvinte())
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte)
  return () => ouvintes.delete(ouvinte)
}

/** Tema atual e a funcao para trocar; qualquer componente que usar fica em sincronia. */
export function useTema() {
  const tema = useSyncExternalStore(assinar, () => temaAtual, () => 'claro' as Tema)
  return { tema, escuro: tema === 'escuro', definirTema }
}
