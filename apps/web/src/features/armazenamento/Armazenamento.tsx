import { Carregando, Erro } from '../../components/Estado'
import { armazenamentoRepo } from '../../data'
import { useSubtitulo } from '../../layout/pagina'
import { useDados } from '../../lib/dados'
import { numero } from '../../lib/formato'
import { useConsulta } from '../../lib/useConsulta'

export function Armazenamento() {
  const { versao } = useDados()
  const { dados, carregando, erro, recarregar } = useConsulta(() => armazenamentoRepo.resumo(), [versao])

  useSubtitulo(
    dados
      ? `OneDrive · ${dados.totalGb.toFixed(1)} GB usados de ${dados.quotaGb} GB`
      : 'Carregando…',
  )

  if (erro) return <Erro mensagem={erro} aoTentarNovamente={recarregar} />
  if (carregando || !dados) return <Carregando />

  const ocupacao = (dados.totalGb / dados.quotaGb) * 100
  const maiorConsumo = dados.maiores[0]
  const maiorSetor = dados.porSetor[0]

  return (
    <>
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <div className="card kpi">
          <div className="label">Total em uso</div>
          <div className="v">
            {dados.totalGb.toFixed(1)} <small style={{ fontSize: 16, color: 'var(--muted)' }}>GB</small>
          </div>
          <div className="d">
            {ocupacao.toFixed(1)}% de {dados.quotaGb} GB contratados
          </div>
        </div>
        <div className="card kpi">
          <div className="label">Arquivos</div>
          <div className="v">{numero(dados.totalArquivos)}</div>
          <div className="d">em todas as contas do OneDrive</div>
        </div>
        <div className="card kpi">
          <div className="label">Maior consumo</div>
          <div className="v">
            {maiorConsumo?.oneDriveGb.toFixed(1) ?? '0'}{' '}
            <small style={{ fontSize: 16, color: 'var(--muted)' }}>GB</small>
          </div>
          <div className="d">{maiorConsumo?.nome ?? '—'}</div>
        </div>
        <div className="card kpi">
          <div className="label">Em contas inativas</div>
          <div className="v" style={{ color: 'var(--amber)' }}>
            {dados.gbEmContasInativas.toFixed(1)}{' '}
            <small style={{ fontSize: 16, color: 'var(--muted)' }}>GB</small>
          </div>
          <div className="d">candidatos a arquivamento</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-h">
          <h3>Ocupação do tenant</h3>
          <span className="muted" style={{ fontSize: 12.5, marginLeft: 'auto' }}>
            {dados.totalGb.toFixed(1)} GB de {dados.quotaGb} GB
          </span>
        </div>
        <div className="bar" style={{ height: 14 }}>
          <i
            style={{
              width: `${ocupacao.toFixed(1)}%`,
              background: 'linear-gradient(90deg, var(--accent), #6f4bff)',
            }}
          />
        </div>
        <div className="muted" style={{ fontSize: 12.5, marginTop: 12 }}>
          Restam {(dados.quotaGb - dados.totalGb).toFixed(1)} GB livres no armazenamento contratado.
        </div>
      </div>

      <div className="grid g2">
        <div className="card">
          <div className="card-h">
            <h3>Maiores consumidores</h3>
          </div>
          {dados.maiores.map((conta) => (
            <div className="srow" key={conta.upn}>
              <div className="nm">{conta.nome}</div>
              <div className="bar">
                <i
                  style={{
                    width: `${((conta.oneDriveGb / (maiorConsumo?.oneDriveGb || 1)) * 100).toFixed(0)}%`,
                    background: conta.status === 'ativo' ? 'var(--accent)' : 'var(--amber)',
                  }}
                />
              </div>
              <div className="gb">{conta.oneDriveGb.toFixed(1)} GB</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-h">
            <h3>Consumo por setor</h3>
          </div>
          {dados.porSetor.map((linha) => (
            <div className="srow" key={linha.setor}>
              <div className="nm">{linha.setor}</div>
              <div className="bar">
                <i
                  style={{
                    width: `${((linha.gb / (maiorSetor?.gb || 1)) * 100).toFixed(0)}%`,
                    background: 'var(--teal)',
                  }}
                />
              </div>
              <div className="gb">{linha.gb.toFixed(1)} GB</div>
            </div>
          ))}
          <div
            className="muted"
            style={{
              fontSize: 12.5,
              marginTop: 14,
              borderTop: '1px solid var(--line-soft)',
              paddingTop: 12,
            }}
          >
            Contas de recurso (salas e caixas compartilhadas) não consomem OneDrive.
          </div>
        </div>
      </div>
    </>
  )
}
