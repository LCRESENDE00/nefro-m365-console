import { NavLink } from 'react-router-dom'
import {
  IconeAdministracao,
  IconeArmazenamento,
  IconeConfiguracoes,
  IconeLicencas,
  IconeRelatorios,
  IconeUsuarios,
  IconeVisaoGeral,
} from '../components/icones'
import { SEM_BACKEND } from '../data'
import { useSessao } from '../features/login/sessao'
import estilos from './Layout.module.css'

const PAINEL = [
  { para: '/visao-geral', rotulo: 'Visão geral', Icone: IconeVisaoGeral },
  { para: '/usuarios', rotulo: 'Usuários', Icone: IconeUsuarios },
  { para: '/licencas', rotulo: 'Licenças', Icone: IconeLicencas },
  { para: '/armazenamento', rotulo: 'Armazenamento', Icone: IconeArmazenamento },
]

const SAIDA = [
  { para: '/relatorios', rotulo: 'Relatórios', Icone: IconeRelatorios },
  { para: '/administracao', rotulo: 'Administração', Icone: IconeAdministracao },
  { para: '/configuracoes', rotulo: 'Configurações', Icone: IconeConfiguracoes },
]

const classe = ({ isActive }: { isActive: boolean }) =>
  `${estilos.navItem} ${isActive ? estilos.on : ''}`

export function Sidebar({ precisamRevisao }: { precisamRevisao: number | null }) {
  const { sessao, sair } = useSessao()

  return (
    <aside className={estilos.side}>
      <div className={estilos.brand}>
        <div className={estilos.mark}>N</div>
        <div>
          <b>Console M365</b>
          <small>NEFROCLÍNICAS</small>
        </div>
      </div>

      <div className={estilos.navLabel}>Painel</div>
      {PAINEL.map(({ para, rotulo, Icone }) => (
        <NavLink key={para} to={para} className={classe}>
          <Icone />
          {rotulo}
          {para === '/usuarios' && precisamRevisao ? (
            <span className={estilos.tag}>{precisamRevisao}</span>
          ) : null}
        </NavLink>
      ))}

      <div className={estilos.navLabel}>Saída</div>
      {SAIDA.map(({ para, rotulo, Icone }) => (
        <NavLink key={para} to={para} className={classe}>
          <Icone />
          {rotulo}
        </NavLink>
      ))}

      <div className={estilos.sideFoot}>
        <div className={estilos.row}>
          <span className="dot" />
          {SEM_BACKEND
            ? 'Demo estática · sem backend'
            : sessao?.modo === 'demo'
              ? 'Modo demo · banco local'
              : 'Conectado ao tenant'}
        </div>
        <div className={`${estilos.row} mono`} style={{ fontSize: 10.5, opacity: 0.65 }}>
          tenant {sessao?.tenantId.slice(0, 8) ?? '—'}…{sessao?.tenantId.slice(-4) ?? ''}
        </div>
        <button className={estilos.sair} onClick={sair}>
          Sair da sessão
        </button>
      </div>
    </aside>
  )
}
