import { useLocation } from 'react-router-dom'
import { IconeLua, IconeSol } from '../components/icones'
import { useSessao } from '../features/login/sessao'
import { useDadosReais } from '../lib/dadosReais'
import { iniciais } from '../lib/formato'
import { useTema } from '../lib/tema'
import { useSubtituloAtual } from './pagina'
import estilos from './Layout.module.css'

const TITULOS: Record<string, string> = {
  '/visao-geral': 'Visão geral',
  '/usuarios': 'Usuários',
  '/usuarios/nova': 'Nova conta',
  '/licencas': 'Licenças',
  '/economia': 'Economia',
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
  const { escuro, definirTema } = useTema()
  const mostrarJanela = pathname === '/visao-geral' || pathname === '/usuarios' || pathname === '/economia'

  return (
    <header className={estilos.topbar}>
      <div>
        <h1>{TITULOS[pathname] ?? 'NefroControl'}</h1>
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

        <button
          className={estilos.tema}
          onClick={() => definirTema(escuro ? 'claro' : 'escuro')}
          title={escuro ? 'Mudar para o modo claro' : 'Mudar para o modo escuro'}
          aria-label={escuro ? 'Mudar para o modo claro' : 'Mudar para o modo escuro'}
          aria-pressed={escuro}
        >
          {escuro ? <IconeSol /> : <IconeLua />}
        </button>

        <div className={estilos.avatar} title={sessao?.nome}>
          {sessao?.nome ? iniciais(sessao.nome) : '··'}
        </div>
      </div>
    </header>
  )
}
