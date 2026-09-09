import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import estilos from './Toast.module.css'

const ToastContext = createContext<(mensagem: string) => void>(() => {})

export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [mensagem, setMensagem] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const mostrar = useCallback((texto: string) => {
    setMensagem(texto)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMensagem(null), 2600)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <ToastContext.Provider value={mostrar}>
      {children}
      <div className={`${estilos.toast} ${mensagem ? estilos.on : ''}`} role="status" aria-live="polite">
        <span className="dot" />
        {mensagem}
      </div>
    </ToastContext.Provider>
  )
}
