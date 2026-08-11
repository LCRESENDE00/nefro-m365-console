import { useMemo } from 'react'
import { Carregando, Erro } from '../../components/Estado'
import { useSubtitulo } from '../../layout/pagina'
import { useDadosReais } from '../../lib/dadosReais'
import { numero } from '../../lib/formato'

export function Armazenamento() {
  const dr = useDadosReais()
  const contas = dr.armazenamento

  const totalGb = useMemo(() => (contas ? contas.reduce((s, c) => s + c.gb, 0) : 0), [contas])
  const maiores = useMemo(() => (contas ? [...contas].sort((a, b) => b.gb - a.gb).slice(0, 12) : []), [contas])
  const maiorGb = Math.max(1, ...maiores.map((c) => c.gb))

  useSubtitulo(contas ? `OneDrive · ${totalGb.toFixed(1)} GB usados em ${contas.length} contas` : 'Conectando com a Microsoft…')

  if (dr.erroConexao) return <Erro mensagem={dr.erroConexao} aoTentarNovamente={dr.conectar} />
  if (dr.conectando) return <Carregando texto="Lendo o uso de armazenamento…" />
  if (!contas) {
    return (
      <Erro
        mensagem={
          dr.erroArmazenamento ??
          'Não foi possível ler o relatório de armazenamento do OneDrive.'
        }
        aoTentarNovamente={dr.conectar}
      />
    )
  }

  return (
    <>
      <div className="grid g3" style={{ marginBottom: 16 }}>
        <div className="card kpi">
          <div className="label">Total em uso</div>
          <div className="v">
            {totalGb.toFixed(1)} <small style={{ fontSize: 16, color: 'var(--muted)' }}>GB</small>
          </div>
          <div className="d">em {contas.length} contas com OneDrive</div>
        </div>
        <div className="card kpi">
          <div className="label">Maior consumo</div>
          <div className="v">
            {maiores[0]?.gb.toFixed(1) ?? '0'} <small style={{ fontSize: 16, color: 'var(--muted)' }}>GB</small>
          </div>
          <div className="d">{maiores[0]?.nome ?? '—'}</div>
        </div>
        <div className="card kpi">
          <div className="label">Média por conta</div>
          <div className="v">
            {contas.length ? (totalGb / contas.length).toFixed(1) : '0'}{' '}
            <small style={{ fontSize: 16, color: 'var(--muted)' }}>GB</small>
          </div>
          <div className="d">{numero(contas.length)} contas no relatório</div>
        </div>
      </div>

      <div className="card">
        <div className="card-h">
          <h3>Maiores consumidores</h3>
        </div>
        {maiores.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>
            Nenhuma conta com uso de OneDrive encontrada.
          </p>
        ) : (
          maiores.map((conta) => (
            <div className="srow" key={conta.upn}>
              <div className="nm">{conta.nome || conta.upn}</div>
              <div className="bar">
                <i style={{ width: `${(conta.gb / maiorGb) * 100}%`, background: 'var(--accent)' }} />
              </div>
              <div className="gb">{conta.gb.toFixed(1)} GB</div>
            </div>
          ))
        )}
        <div
          className="muted"
          style={{ fontSize: 12.5, marginTop: 14, borderTop: '1px solid var(--line-soft)', paddingTop: 12 }}
        >
          Relatório direto do Microsoft 365 (getOneDriveUsageAccountDetail). Contas de recurso normalmente não
          aparecem aqui.
        </div>
      </div>
    </>
  )
}
