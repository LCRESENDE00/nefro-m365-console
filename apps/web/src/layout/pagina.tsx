import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

/**
 * Cada tela informa seu proprio subtitulo (a linha abaixo do titulo na topbar),
 * porque so ela sabe os numeros que fazem sentido ali.
 */
const PaginaContext = createContext<{ subtitulo: string; definir: (texto: string) => void }>({
  subtitulo: '',
  definir: () => {},
})

export function PaginaProvider({ children }: { children: ReactNode }) {
  const [subtitulo, setSubtitulo] = useState('')
  const definir = useCallback((texto: string) => setSubtitulo(texto), [])
  const valor = useMemo(() => ({ subtitulo, definir }), [subtitulo, definir])

  return <PaginaContext.Provider value={valor}>{children}</PaginaContext.Provider>
}

export const useSubtituloAtual = () => useContext(PaginaContext).subtitulo

export function useSubtitulo(texto: string) {
  const { definir } = useContext(PaginaContext)
  useEffect(() => definir(texto), [texto, definir])
}
