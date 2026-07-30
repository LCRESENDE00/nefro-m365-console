import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { IconeExportar } from '../components/icones'
import { useToast } from '../components/Toast'
import { configuracoesRepo, relatoriosRepo } from '../data'
import { baixar } from '../lib/baixar'
import { useDados } from '../lib/dados'
import { iniciais } from '../lib/formato'
import { useConsulta } from '../lib/useConsulta'
import { useSubtituloAtual } from './pagina'
import estilos from './Layout.module.css'

const TITULOS: Record<string, string> = {
  '/visao-geral': 'Visão geral',
  '/usuarios': 'Usuários',
  '/licencas': 'Licenças',
  '/armazenamento': 'Armazenamento',
  '/relatorios': 'Relatórios',
  '/configuracoes': 'Configurações',
}

const JANELAS = [30, 60, 90]

export function Topbar({ limiarInativo }: { limiarInativo: number | null }) {
  const { pathname } = useLocation()
  const subtitulo = useSubtituloAtual()
  const toast = useToast()
  const { versao, invalidar } = useDados()
  const [exportando, setExportando] = useState(false)
  const { dados: config } = useConsulta(() => configuracoesRepo.ler(), [versao])

  /** A janela define a partir de quantos dias sem acesso a conta vira "inativa". */
  async function trocarJanela(dias: number) {
    await configuracoesRepo.salvar({ limiarInativo: dias })
    invalidar()
    toast(`Janela de análise: ${dias} dias`)
  }

  async function exportar() {
    setExportando(true)
    try {
      const arquivo = await relatoriosRepo.gerar('usuarios-inativos')
      baixar(arquivo)
      invalidar()
      toast(`Planilha gerada: ${arquivo.nome}`)
    } catch (erro) {
      toast((erro as Error).message)
    } finally {
      setExportando(false)
    }
  }

  return (
    <header className={estilos.topbar}>
      <div>
        <h1>{TITULOS[pathname] ?? 'Console M365'}</h1>
        <div className={estilos.sub}>{subtitulo}</div>
      </div>

      <div className={estilos.right}>
        <div className={estilos.seg} role="group" aria-label="Janela de análise">
          {JANELAS.map((dias) => (
            <button
              key={dias}
              className={limiarInativo === dias ? estilos.on : ''}
              onClick={() => trocarJanela(dias)}
            >
              {dias}d
            </button>
          ))}
        </div>

        <button className="btn" onClick={exportar} disabled={exportando}>
          <IconeExportar />
          {exportando ? 'Gerando…' : 'Exportar'}
        </button>

        <div className={estilos.avatar} title={config?.contaConectada}>
          {config ? iniciais(config.contaConectada.split('@')[0].replace(/\./g, ' ')) : '··'}
        </div>
      </div>
    </header>
  )
}
