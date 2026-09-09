import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type Contexto = {
  /** Muda a cada gravacao no banco; as telas usam como dependencia para recarregar. */
  versao: number
  invalidar: () => void
}

const DadosContext = createContext<Contexto>({ versao: 0, invalidar: () => {} })

export const useDados = () => useContext(DadosContext)

export function DadosProvider({ children }: { children: ReactNode }) {
  const [versao, setVersao] = useState(0)
  const invalidar = useCallback(() => setVersao((v) => v + 1), [])
  const valor = useMemo(() => ({ versao, invalidar }), [versao, invalidar])

  return <DadosContext.Provider value={valor}>{children}</DadosContext.Provider>
}
