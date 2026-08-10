import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { SEM_BACKEND } from '../../data'

export type Sessao = {
    tenantId: string
    clientId: string
    modo: 'microsoft' | 'demo'
    nome?: string
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
    carregandoSessao: boolean
    entrar: (sessao: Sessao) => void
    entrarComMicrosoft: () => void
    sair: () => void
}

const SessaoContext = createContext<Contexto>({
    sessao: null,
    carregandoSessao: false,
    entrar: () => {},
    entrarComMicrosoft: () => {},
    sair: () => {},
})

export const useSessao = () => useContext(SessaoContext)

/**
   * Sessao simulada no modo demo: guarda tenant/client no localStorage apenas
   * para decidir se mostra o login. Quando ha backend de verdade (SEM_BACKEND
   * = false), o login com a Microsoft usa o fluxo real do Entra ID nas rotas
   * /api/auth/* (apps/api/src/rotas/auth.ts) e a sessao vem de GET /api/auth/me.
   */
export function SessaoProvider({ children }: { children: ReactNode }) {
    const [sessao, setSessao] = useState<Sessao | null>(lerSessaoSalva)
    const [carregandoSessao, setCarregandoSessao] = useState(!SEM_BACKEND)

  useEffect(() => {
        if (SEM_BACKEND) return

                let ativo = true

                fetch('/api/auth/me')
          .then((resposta) => (resposta.ok ? resposta.json() : { autenticado: false }))
          .then((dados) => {
                    if (!ativo || !dados.autenticado) return
                    const nova: Sessao = {
                                tenantId: dados.tenantId ?? '',
                                clientId: dados.clientId ?? '',
                                modo: 'microsoft',
                                nome: dados.nome,
                    }
                    localStorage.setItem(CHAVE, JSON.stringify(nova))
                    setSessao(nova)
          })
          .catch(() => {})
          .finally(() => {
                    if (ativo) setCarregandoSessao(false)
          })

                return () => {
                        ativo = false
                }
  }, [])

  const entrar = useCallback((nova: Sessao) => {
        localStorage.setItem(CHAVE, JSON.stringify(nova))
        setSessao(nova)
  }, [])

  const entrarComMicrosoft = useCallback(() => {
        if (SEM_BACKEND) return
        window.location.href = '/api/auth/login'
  }, [])

  const sair = useCallback(() => {
        localStorage.removeItem(CHAVE)
        setSessao(null)
        if (!SEM_BACKEND) {
                fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
        }
  }, [])

  const valor = useMemo(
        () => ({ sessao, carregandoSessao, entrar, entrarComMicrosoft, sair }),
        [sessao, carregandoSessao, entrar, entrarComMicrosoft, sair],
      )

  return <SessaoContext.Provider value={valor}>{children}</SessaoContext.Provider>
    }
