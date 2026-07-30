import { useEffect, type ReactNode } from 'react'
import estilos from './Drawer.module.css'

type Props = {
  aberto: boolean
  aoFechar: () => void
  children: ReactNode
}

export function Drawer({ aberto, aoFechar, children }: Props) {
  useEffect(() => {
    if (!aberto) return
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [aberto, aoFechar])

  return (
    <>
      <div className={`${estilos.scrim} ${aberto ? estilos.on : ''}`} onClick={aoFechar} />
      <aside className={`${estilos.drawer} ${aberto ? estilos.on : ''}`} aria-hidden={!aberto}>
        {aberto && (
          <>
            <button className={estilos.fechar} onClick={aoFechar} aria-label="Fechar">
              ✕
            </button>
            {children}
          </>
        )}
      </aside>
    </>
  )
}
