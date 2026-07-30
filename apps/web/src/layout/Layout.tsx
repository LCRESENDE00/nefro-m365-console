import { Navigate, Outlet } from 'react-router-dom'
import { metricasRepo } from '../data'
import { useSessao } from '../features/login/sessao'
import { useDados } from '../lib/dados'
import { useConsulta } from '../lib/useConsulta'
import { PaginaProvider } from './pagina'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import estilos from './Layout.module.css'

export function Layout() {
  const { sessao } = useSessao()
  const { versao } = useDados()
  const { dados } = useConsulta(() => metricasRepo.visaoGeral(), [versao])

  if (!sessao) return <Navigate to="/login" replace />

  return (
    <PaginaProvider>
      <div className={estilos.shell}>
        <Sidebar precisamRevisao={dados ? dados.ociosos + dados.inativos : null} />
        <main className={estilos.main}>
          <Topbar limiarInativo={dados?.limiares.limiarInativo ?? null} />
          <div className={estilos.page}>
            <Outlet />
          </div>
        </main>
      </div>
    </PaginaProvider>
  )
}
