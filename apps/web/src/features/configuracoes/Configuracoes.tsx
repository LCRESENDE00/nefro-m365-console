import { useState } from 'react'
import { Carregando, Erro } from '../../components/Estado'
import { LinhaToggle } from '../../components/LinhaToggle'
import { useToast } from '../../components/Toast'
import { configuracoesRepo, type Configuracoes as Preferencias } from '../../data'
import { useSubtitulo } from '../../layout/pagina'
import { useDados } from '../../lib/dados'
import { useConsulta } from '../../lib/useConsulta'
import estilos from './Configuracoes.module.css'

const JANELAS_OCIOSO = [15, 30, 60]

export function Configuracoes() {
  const { versao, invalidar } = useDados()
  const toast = useToast()
  const [sincronizando, setSincronizando] = useState(false)
  const { dados, carregando, erro, recarregar } = useConsulta(() => configuracoesRepo.ler(), [versao])

  useSubtitulo('Conexão, permissões e preferências gravadas no banco')

  async function salvar(mudancas: Partial<Preferencias>, mensagem: string) {
    await configuracoesRepo.salvar(mudancas)
    invalidar()
    toast(mensagem)
  }

  async function sincronizar() {
    setSincronizando(true)
    invalidar()
    setSincronizando(false)
    toast('Dados recarregados do banco local')
  }

  if (erro) return <Erro mensagem={erro} aoTentarNovamente={recarregar} />
  if (carregando || !dados) return <Carregando />

  return (
    <>
      <div className="grid g2">
        <div className="card">
          <div className="card-h">
            <h3>Conexão</h3>
            <span className="badge b-ok" style={{ marginLeft: 'auto' }}>
              <span className="dot" />
              {dados.modoDemo ? 'Modo demo' : 'Conectado'}
            </span>
          </div>
          <div className="dl">
            <span>Tenant</span>
            <b className="mono" style={{ fontSize: 12 }}>
              {dados.tenantId}
            </b>
          </div>
          <div className="dl">
            <span>Client ID</span>
            <b className="mono" style={{ fontSize: 12 }}>
              {dados.clientId}
            </b>
          </div>
          <div className="dl">
            <span>Conta</span>
            <b>{dados.contaConectada}</b>
          </div>
          <div className="dl">
            <span>Origem dos dados</span>
            <b>{dados.modoDemo ? 'banco local (seed)' : 'Microsoft Graph'}</b>
          </div>
          <button className="btn" style={{ marginTop: 16 }} onClick={sincronizar} disabled={sincronizando}>
            Sincronizar agora
          </button>
        </div>

        <div className="card">
          <div className="card-h">
            <h3>Permissões concedidas</h3>
          </div>
          <p className="muted" style={{ fontSize: 12.8, margin: '0 0 6px' }}>
            O app usa apenas permissões de leitura. Nenhuma conta pode ser criada ou alterada por
            aqui.
          </p>
          {dados.permissoes.map((permissao) => (
            <div className={estilos.perm} key={permissao}>
              <span className="badge b-ok" style={{ fontFamily: 'var(--sans)' }}>
                consentida
              </span>
              {permissao}
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-h">
          <h3>Preferências</h3>
        </div>

        <div className="set-row">
          <div className="txt">
            <b>Considerar conta ociosa após</b>
            <span>Contas sem login nesse período deixam de contar como ativas</span>
          </div>
          <select
            className="sel"
            value={dados.limiarOcioso}
            onChange={(e) => salvar({ limiarOcioso: Number(e.target.value) }, 'Limiar atualizado')}
          >
            {JANELAS_OCIOSO.map((dias) => (
              <option key={dias} value={dias}>
                {dias} dias
              </option>
            ))}
          </select>
        </div>

        <div className="set-row">
          <div className="txt">
            <b>Considerar conta inativa após</b>
            <span>Também controlado pelo seletor 30d / 60d / 90d no topo</span>
          </div>
          <select
            className="sel"
            value={dados.limiarInativo}
            onChange={(e) => salvar({ limiarInativo: Number(e.target.value) }, 'Janela atualizada')}
          >
            {[30, 60, 90].map((dias) => (
              <option key={dias} value={dias}>
                {dias} dias
              </option>
            ))}
          </select>
        </div>

        <LinhaToggle
          titulo="Atualizar ao abrir o app"
          descricao="Busca os dados automaticamente na inicialização"
          ligado={dados.atualizarAoAbrir}
          aoAlternar={(valor) => salvar({ atualizarAoAbrir: valor }, 'Preferência salva')}
        />
        <LinhaToggle
          titulo="Incluir contas de recurso"
          descricao="Salas de reunião e caixas compartilhadas nas listagens e nos relatórios"
          ligado={dados.incluirRecursos}
          aoAlternar={(valor) => salvar({ incluirRecursos: valor }, 'Preferência salva')}
        />
        <LinhaToggle
          titulo="Modo demo"
          descricao="Lê o banco local semeado, sem tocar no tenant"
          ligado={dados.modoDemo}
          aoAlternar={(valor) => salvar({ modoDemo: valor }, 'Preferência salva')}
        />
      </div>

      {dados.marcadasParaRevisao.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-h">
            <h3>Contas marcadas para revisão</h3>
            <span className="muted" style={{ fontSize: 12.5, marginLeft: 'auto' }}>
              {dados.marcadasParaRevisao.length}
            </span>
          </div>
          {dados.marcadasParaRevisao.map((upn) => (
            <div className={estilos.perm} key={upn}>
              <span className="badge b-warn" style={{ fontFamily: 'var(--sans)' }}>
                pendente
              </span>
              {upn}
            </div>
          ))}
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-h">
          <h3>Sobre</h3>
        </div>
        <div className="dl">
          <span>Versão</span>
          <b className="mono">0.3.0</b>
        </div>
        <div className="dl">
          <span>Base</span>
          <b>React · TypeScript · Express · Prisma · SQLite</b>
        </div>
        <div className="dl">
          <span>Banco local</span>
          <b className="mono" style={{ fontSize: 12 }}>
            apps/api/prisma/dev.db
          </b>
        </div>
      </div>
    </>
  )
}
