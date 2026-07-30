import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export type Sessao = {
  tenantId: string
  clientId: string
  modo: 'microsoft' | 'demo'
}

const CHAVE = 'console-m365:sessao'

function lerSessaoSalva(): Sessao | null {
  try {
    const bruto = localStorage.getItem(CHAVE)
    return bruto ? (JSON.parse(bruto) as Sessao) : null
  } catch {
    return null
  }
}

type Contexto = {
  sessao: Sessao | null
  entrar: (sessao: Sessao) => void
  sair: () => void
}

const SessaoContext = createContext<Contexto>({ sessao: null, entrar: () => {}, sair: () => {} })

export const useSessao = () => useContext(SessaoContext)

/**
 * Sessao simulada no MVP: guarda tenant/client no localStorage apenas para
 * decidir se mostra o login. Nao existe autenticacao real contra o Entra ID.
 */
export function SessaoProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(lerSessaoSalva)

  const entrar = useCallback((nova: Sessao) => {
    localStorage.setItem(CHAVE, JSON.stringify(nova))
    setSessao(nova)
  }, [])

  const sair = useCallback(() => {
    localStorage.removeItem(CHAVE)
    setSessao(null)
  }, [])

  const valor = useMemo(() => ({ sessao, entrar, sair }), [sessao, entrar, sair])

  return <SessaoContext.Provider value={valor}>{children}</SessaoContext.Provider>
}
