import { useState } from 'react'
import {
  lerArmazenamento,
  lerContaConectada,
  lerLicencas,
  lerRegistroMfa,
  lerUsuarios,
  type ContaArmazenamento,
  type LicencaReal,
  type RegistroMfa,
  type UsuarioReal,
} from '../../lib/graph'

type Resultado = {
  nome?: string
  licencas: LicencaReal[]
  usuarios: UsuarioReal[] | null
  erroUsuarios: string | null
  mfa: RegistroMfa[] | null
  erroMfa: string | null
  armazenamento: ContaArmazenamento[] | null
  erroArmazenamento: string | null
}

function diasParaStatus(dias: number | null): 'ativo' | 'ocioso' | 'inativo' | 'nunca' {
  if (dias === null) return 'nunca'
  if (dias <= 30) return 'ativo'
  if (dias <= 90) return 'ocioso'
  return 'inativo'
}

export function LicencasReais() {
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [dados, setDados] = useState<Resultado | null>(null)

  function conectar() {
    setCarregando(true)
    setErro(null)
    ;(async () => {
      const conta = await lerContaConectada().catch(() => null)
      const licencas = await lerLicencas()

      const [rUsuarios, rMfa, rArmazenamento] = await Promise.allSettled([
        lerUsuarios(),
        lerRegistroMfa(),
        lerArmazenamento(),
      ])

      const contaFinal = conta ?? (await lerContaConectada().catch(() => null))

      setDados({
        nome: contaFinal ? contaFinal.nome : undefined,
        licencas,
        usuarios: rUsuarios.status === 'fulfilled' ? rUsuarios.value : null,
        erroUsuarios: rUsuarios.status === 'rejected' ? String(rUsuarios.reason?.message ?? rUsuarios.reason) : null,
        mfa: rMfa.status === 'fulfilled' ? rMfa.value : null,
        erroMfa: rMfa.status === 'rejected' ? String(rMfa.reason?.message ?? rMfa.reason) : null,
        armazenamento: rArmazenamento.status === 'fulfilled' ? rArmazenamento.value : null,
        erroArmazenamento:
          rArmazenamento.status === 'rejected' ? String(rArmazenamento.reason?.message ?? rArmazenamento.reason) : null,
      })
    })()
      .catch((e) => setErro(e && e.message ? e.message : 'Nao foi possivel conectar com a Microsoft.'))
      .finally(() => setCarregando(false))
  }

  const usuarios = dados?.usuarios ?? null
  const licenciados = usuarios ? usuarios.filter((u) => u.totalLicencas > 0) : null
  const contagem = { ativo: 0, ocioso: 0, inativo: 0, nunca: 0 }
  if (licenciados) {
    for (const u of licenciados) contagem[diasParaStatus(u.diasUltimoAcesso)]++
  }
  const mapaMfa = new Map((dados?.mfa ?? []).map((m) => [m.upn.toLowerCase(), m.mfaRegistrado]))
  const semMfa = licenciados
    ? licenciados.filter((u) => mapaMfa.get(u.upn.toLowerCase()) === false).length
    : null
  const totalGb = dados?.armazenamento ? dados.armazenamento.reduce((s, c) => s + c.gb, 0) : null
  const topArmazenamento = dados?.armazenamento
    ? [...dados.armazenamento].sort((a, b) => b.gb - a.gb).slice(0, 10)
    : []

  return (
    <div className="card" style={{ padding: 24 }}>
      <h2>Painel real do tenant</h2>
      <p className="muted" style={{ fontSize: 13 }}>
        Login real com a Microsoft, sem simulacao. Leitura direta da Microsoft Graph. Somente leitura.
      </p>

      {!dados ? (
        <button className="btn btn-primary" onClick={conectar} disabled={carregando}>
          {carregando ? 'Conectando...' : 'Conectar com a Microsoft'}
        </button>
      ) : null}

      {erro ? <p style={{ color: 'var(--rose)', marginTop: 12 }}>{erro}</p> : null}

      {dados ? (
        <div style={{ marginTop: 20 }}>
          {dados.nome ? (
            <p>
              Logado como <b>{dados.nome}</b>
            </p>
          ) : null}

          {licenciados ? (
            <section style={{ marginTop: 24 }}>
              <h3>Visao geral real</h3>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
                <div className="card" style={{ padding: 16, minWidth: 140 }}>
                  <div className="muted" style={{ fontSize: 12 }}>
                    CONTAS LICENCIADAS
                  </div>
                  <div style={{ fontSize: 28 }}>{licenciados.length}</div>
                </div>
                <div className="card" style={{ padding: 16, minWidth: 140 }}>
                  <div className="muted" style={{ fontSize: 12 }}>
                    ATIVAS (30d)
                  </div>
                  <div style={{ fontSize: 28 }}>{contagem.ativo}</div>
                </div>
                <div className="card" style={{ padding: 16, minWidth: 140 }}>
                  <div className="muted" style={{ fontSize: 12 }}>
                    OCIOSAS (31-90d)
                  </div>
                  <div style={{ fontSize: 28 }}>{contagem.ocioso}</div>
                </div>
                <div className="card" style={{ padding: 16, minWidth: 140 }}>
                  <div className="muted" style={{ fontSize: 12 }}>
                    INATIVAS (90d+)
                  </div>
                  <div style={{ fontSize: 28 }}>{contagem.inativo + contagem.nunca}</div>
                </div>
                <div className="card" style={{ padding: 16, minWidth: 140 }}>
                  <div className="muted" style={{ fontSize: 12 }}>
                    SEM MFA
                  </div>
                  <div style={{ fontSize: 28 }}>{semMfa === null ? '—' : semMfa}</div>
                </div>
              </div>
            </section>
          ) : dados.erroUsuarios ? (
            <p style={{ color: 'var(--rose)', marginTop: 12 }}>Usuarios/visao geral indisponivel: {dados.erroUsuarios}</p>
          ) : null}

          <section style={{ marginTop: 24 }}>
            <h3>Licencas reais</h3>
            <table style={{ width: '100%', marginTop: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Licenca</th>
                  <th>Comprados</th>
                  <th>Em uso</th>
                  <th>Livres</th>
                </tr>
              </thead>
              <tbody>
                {dados.licencas.map((sku) => (
                  <tr key={sku.skuId}>
                    <td>{sku.skuPartNumber}</td>
                    <td style={{ textAlign: 'center' }}>{sku.comprados}</td>
                    <td style={{ textAlign: 'center' }}>{sku.emUso}</td>
                    <td style={{ textAlign: 'center' }}>{sku.livres}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {usuarios ? (
            <section style={{ marginTop: 24 }}>
              <h3>Usuarios reais ({usuarios.length})</h3>
              <div style={{ maxHeight: 360, overflow: 'auto', marginTop: 12 }}>
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Nome</th>
                      <th style={{ textAlign: 'left' }}>UPN</th>
                      <th>Habilitada</th>
                      <th>Ultimo acesso</th>
                      <th>Licencas</th>
                      <th>MFA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuarios.map((u) => {
                      const mfaConta = mapaMfa.get(u.upn.toLowerCase())
                      return (
                        <tr key={u.id}>
                          <td>{u.nome}</td>
                          <td>{u.upn}</td>
                          <td style={{ textAlign: 'center' }}>{u.habilitada ? 'sim' : 'nao'}</td>
                          <td style={{ textAlign: 'center' }}>
                            {u.diasUltimoAcesso === null ? 'nunca' : u.diasUltimoAcesso + 'd'}
                          </td>
                          <td style={{ textAlign: 'center' }}>{u.totalLicencas}</td>
                          <td style={{ textAlign: 'center' }}>
                            {mfaConta === undefined ? '—' : mfaConta ? 'sim' : 'nao'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ) : dados.erroUsuarios ? null : null}

          <section style={{ marginTop: 24 }}>
            <h3>Armazenamento real (OneDrive)</h3>
            {dados.armazenamento ? (
              <>
                <p className="muted" style={{ fontSize: 13 }}>
                  Total usado: {totalGb !== null ? totalGb.toFixed(1) : '—'} GB em {dados.armazenamento.length} contas
                </p>
                <table style={{ width: '100%', marginTop: 8 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Nome</th>
                      <th style={{ textAlign: 'left' }}>UPN</th>
                      <th>GB usados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topArmazenamento.map((c) => (
                      <tr key={c.upn}>
                        <td>{c.nome}</td>
                        <td>{c.upn}</td>
                        <td style={{ textAlign: 'center' }}>{c.gb.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <p style={{ color: 'var(--rose)', marginTop: 8 }}>Indisponivel: {dados.erroArmazenamento}</p>
            )}
          </section>

          <p className="muted" style={{ fontSize: 12, marginTop: 24 }}>
            Cargo, setor, unidade, contrato e custo nao aparecem aqui porque essas informacoes nao existem na
            Microsoft Graph: elas sao dados de gestao proprios da clinica e precisam de um backend com banco de
            dados de verdade para serem reais (a demo publicada no GitHub Pages e so um site estatico).
          </p>
        </div>
      ) : null}
    </div>
  )
}
