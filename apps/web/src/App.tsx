import { Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import { Administracao } from './features/administracao/Administracao'
import { Armazenamento } from './features/armazenamento/Armazenamento'
import { Configuracoes } from './features/configuracoes/Configuracoes'
import { Licencas } from './features/licencas/Licencas'; import { LicencasReais } from './features/licencas-reais/LicencasReais'
import { Login } from './features/login/Login'
import { SessaoProvider } from './features/login/sessao'
import { Relatorios } from './features/relatorios/Relatorios'
import { Usuarios } from './features/usuarios/Usuarios'
import { VisaoGeral } from './features/visao-geral/VisaoGeral'
import { Layout } from './layout/Layout'
import { DadosProvider } from './lib/dados'

export function App() {
  return (
    <SessaoProvider>
      <DadosProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Layout />}>
              <Route path="/visao-geral" element={<VisaoGeral />} />
              <Route path="/usuarios" element={<Usuarios />} />
              <Route path="/licencas" element={<Licencas />} /> <Route path="/licencas-reais" element={<LicencasReais />} />
              <Route path="/armazenamento" element={<Armazenamento />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/administracao" element={<Administracao />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
            </Route>
            <Route path="*" element={<Navigate to="/visao-geral" replace />} />
          </Routes>
        </ToastProvider>
      </DadosProvider>
    </SessaoProvider>
  )
}
