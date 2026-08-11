import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useSessao } from '../features/login/sessao'
import { DadosReaisProvider, diasParaStatus, useDadosReais } from '../lib/dadosReais'
import { PaginaProvider } from './pagina'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import estilos from './Layout.module.css'

function Conteudo() {
  const dr = useDadosReais()

  useEffect(() => {
    if (!dr.conectado && !dr.conectando) void dr.conectar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const revisao = dr.usuarios
    ? dr.usuarios.filter((u) => {
        const status = diasParaStatus(u.diasUltimoAcesso, dr.limiarOcioso, dr.limiarInativo)
        return status !== 'ativo'
      }).length
    : null

  if (dr.erroConexao) {
    return (
      <div className={estilos.shell}>
        <main className={estilos.main}>
          <div className="card" style={{ margin: 32, padding: 32 }}>
            <h2>Não foi possível conectar com a Microsoft</h2>
            <p className="muted" style={{ marginTop: 8 }}>{dr.erroConexao}</p>
            <button className="btn btn-primary" onClick={() => void dr.conectar()} style={{ marginTop: 16 }}>
              Tentar de novo
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className={estilos.shell}>
      <Sidebar precisamRevisao={revisao} />
      <main className={estilos.main}>
        <Topbar />
        <div className={estilos.page}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export function Layout() {
  const { sessao } = useSessao()
  if (!sessao) return <Navigate to="/login" replace />

  return (
    <PaginaProvider>
      <DadosReaisProvider>
        <Conteudo />
      </DadosReaisProvider>
    </PaginaProvider>
  )
}
