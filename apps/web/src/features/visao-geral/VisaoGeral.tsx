import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Carregando, Erro } from '../../components/Estado'
import { useSubtitulo } from '../../layout/pagina'
import { diasParaStatus, useDadosReais } from '../../lib/dadosReais'
import { BADGE, iniciais, quando } from '../../lib/formato'

export function VisaoGeral() {
  const navegar = useNavigate()
  const dr = useDadosReais()
  const usuarios = dr.usuarios

  const licenciados = useMemo(() => (usuarios ? usuarios.filter((u) => u.totalLicencas > 0) : null), [usuarios])

  const contagem = useMemo(() => {
    const c = { ativo: 0, ocioso: 0, inativo: 0, nunca: 0 }
    if (licenciados) {
      for (const u of licenciados) c[diasParaStatus(u.diasUltimoAcesso, dr.limiarOcioso, dr.limiarInativo)]++
    }
    return c
  }, [licenciados, dr.limiarOcioso, dr.limiarInativo])

  const semMfa = licenciados ? licenciados.filter((u) => dr.mapaMfa.get(u.upn.toLowerCase()) === false).length : null

  const revisao = useMemo(() => {
    if (!licenciados) return []
    return [...licenciados]
      .filter((u) => diasParaStatus(u.diasUltimoAcesso, dr.limiarOcioso, dr.limiarInativo) !== 'ativo')
      .sort((a, b) => (b.diasUltimoAcesso ?? 99999) - (a.diasUltimoAcesso ?? 99999))
      .slice(0, 8)
  }, [licenciados, dr.limiarOcioso, dr.limiarInativo])

  useSubtitulo(
    licenciados
      ? `Sem acesso há mais de ${dr.limiarInativo} dias conta como inativa · ${licenciados.length} contas licenciadas`
      : 'Conectando com a Microsoft…',
  )

  if (dr.erroConexao) return <Erro mensagem={dr.erroConexao} aoTentarNovamente={dr.conectar} />
  if (dr.conectando || !usuarios) {
    return dr.erroUsuarios ? <Erro mensagem={dr.erroUsuarios} /> : <Carregando texto="Lendo o Microsoft 365…" />
  }

  const maiorLicenca = Math.max(1, ...dr.licencas.map((l) => l.emUso))

  return (
    <>
      <div className="grid g4">
        <div className="card kpi">
          <div className="label">Contas licenciadas</div>
          <div className="v">{licenciados?.length ?? 0}</div>
          <div className="d">
            {contagem.ativo} com acesso nos últimos {dr.limiarOcioso} dias
          </div>
        </div>
        <div className="card kpi">
          <div className="label">Ociosas</div>
          <div className="v" style={{ color: 'var(--amber)' }}>
            {contagem.ocioso}
          </div>
          <div className="d">
            sem acesso entre {dr.limiarOcioso + 1} e {dr.limiarInativo} dias
          </div>
        </div>
        <div className="card kpi">
          <div className="label">Inativas</div>
          <div className="v" style={{ color: 'var(--rose)' }}>
            {contagem.inativo + contagem.nunca}
          </div>
          <div className="d">incluindo contas que nunca acessaram</div>
        </div>
        <div className="card kpi">
          <div className="label">Sem MFA</div>
          <div className="v">{semMfa === null ? '—' : semMfa}</div>
          <div className="d">{dr.erroMfa ? 'relatório de MFA indisponível' : `de ${licenciados?.length ?? 0} contas licenciadas`}</div>
        </div>
      </div>

      <div className="grid g2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-h">
            <h3>Licenças em uso</h3>
            <span className="muted" style={{ fontSize: 12, marginLeft: 'auto' }}>
              {dr.licencas.length} planos
            </span>
          </div>
          {dr.licencas.map((sku) => (
            <div className="srow" key={sku.skuId}>
              <div className="nm">{sku.nome}</div>
              <div className="bar">
                <i style={{ width: `${(sku.emUso / maiorLicenca) * 100}%`, background: 'var(--accent)' }} />
              </div>
              <div className="gb">
                {sku.emUso}/{sku.comprados}
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-h">
            <h3>Precisam de revisão</h3>
            <button className="act" onClick={() => navegar('/usuarios')}>
              Ver todos
            </button>
          </div>
          {revisao.length === 0 ? (
            <p className="muted" style={{ fontSize: 13 }}>
              Nenhuma conta ociosa ou inativa nesta janela.
            </p>
          ) : (
            revisao.map((u) => (
              <div key={u.upn} className="srow" style={{ cursor: 'pointer' }} onClick={() => navegar('/usuarios')}>
                <div className="person" style={{ flex: 1, minWidth: 0 }}>
                  <div className="av">{iniciais(u.nome)}</div>
                  <div style={{ minWidth: 0 }}>
                    <b>{u.nome}</b>
                    <span>{u.upn}</span>
                  </div>
                </div>
                <span className={`badge ${BADGE[diasParaStatus(u.diasUltimoAcesso, dr.limiarOcioso, dr.limiarInativo)].classe}`}>
                  {quando(u.diasUltimoAcesso)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>
        Cargo, setor e custo por licença não aparecem aqui porque não existem na Microsoft Graph — precisam de um
        backend com banco de dados próprio da clínica.
      </p>
    </>
  )
}
