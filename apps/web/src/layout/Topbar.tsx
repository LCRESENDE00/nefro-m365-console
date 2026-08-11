import { useLocation } from 'react-router-dom'
import { useSessao } from '../features/login/sessao'
import { useDadosReais } from '../lib/dadosReais'
import { iniciais } from '../lib/formato'
import { useSubtituloAtual } from './pagina'
import estilos from './Layout.module.css'

const TITULOS: Record<string, string> = {
  '/visao-geral': 'Visão geral',
  '/usuarios': 'Usuários',
  '/licencas': 'Licenças',
  '/armazenamento': 'Armazenamento',
  '/relatorios': 'Relatórios',
  '/administracao': 'Administração',
  '/configuracoes': 'Configurações',
}

const JANELAS = [30, 60, 90]

export function Topbar() {
  const { pathname } = useLocation()
  const subtitulo = useSubtituloAtual()
  const { sessao } = useSessao()
  const { limiarInativo, definirLimiarInativo } = useDadosReais()
  const mostrarJanela = pathname === '/visao-geral' || pathname === '/usuarios'

  return (
    <header className={estilos.topbar}>
      <div>
        <h1>{TITULOS[pathname] ?? 'Console M365'}</h1>
        <div className={estilos.sub}>{subtitulo}</div>
      </div>

      <div className={estilos.right}>
        {mostrarJanela ? (
          <div className={estilos.seg} role="group" aria-label="A partir de quantos dias uma conta é inativa">
            {JANELAS.map((dias) => (
              <button key={dias} className={limiarInativo === dias ? estilos.on : ''} onClick={() => definirLimiarInativo(dias)}>
                {dias}d
              </button>
            ))}
          </div>
        ) : null}

        <div className={estilos.avatar} title={sessao?.nome}>
          {sessao?.nome ? iniciais(sessao.nome) : '··'}
        </div>
      </div>
    </header>
  )
}
