import { useMemo, useState, type CSSProperties } from 'react'
import { Carregando, Erro } from '../../components/Estado'
import { IconeBusca, IconeChave, IconeInativar, IconeNovaConta } from '../../components/icones'
import { useToast } from '../../components/Toast'
import { useSubtitulo } from '../../layout/pagina'
import { diasParaStatus, useDadosReais, type StatusReal } from '../../lib/dadosReais'
import { BADGE, iniciais, quando } from '../../lib/formato'
import { gerarSenhaTemporaria, type UsuarioReal } from '../../lib/graph'
import estilos from './Usuarios.module.css'

const STATUS: Array<[StatusReal | 'todos', string]> = [
  ['todos', 'Todos'],
  ['ativo', 'Ativos'],
  ['ocioso', 'Ociosos'],
  ['inativo', 'Inativos'],
  ['nunca', 'Nunca acessaram'],
]

type EstadoNovaConta = {
  aberto: boolean
  nome: string
  upn: string
  confirmando: boolean
  criando: boolean
  erro: string | null
  criado: { upn: string; senha: string } | null
}

const NOVA_CONTA_INICIAL: EstadoNovaConta = {
  aberto: false,
  nome: '',
  upn: '',
  confirmando: false,
  criando: false,
  erro: null,
  criado: null,
}

type AcaoSenha = { usuario: UsuarioReal; executando: boolean; erro: string | null; senha: string | null }
type AcaoSituacao = { usuario: UsuarioReal; habilitarPara: boolean; executando: boolean; erro: string | null }

const OVERLAY: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.55)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
  padding: 16,
}

export function Usuarios() {
  const dr = useDadosReais()
  const toast = useToast()
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState<StatusReal | 'todos'>('todos')
  const [novaConta, setNovaConta] = useState<EstadoNovaConta>(NOVA_CONTA_INICIAL)
  const [acaoSenha, setAcaoSenha] = useState<AcaoSenha | null>(null)
  const [acaoSituacao, setAcaoSituacao] = useState<AcaoSituacao | null>(null)

  const usuarios = dr.usuarios

  const filtrados = useMemo(() => {
    if (!usuarios) return null
    const termo = busca.trim().toLowerCase()
    return usuarios
      .filter((u) => !termo || u.nome.toLowerCase().includes(termo) || u.upn.toLowerCase().includes(termo))
      .filter((u) => status === 'todos' || diasParaStatus(u.diasUltimoAcesso, dr.limiarOcioso, dr.limiarInativo) === status)
      .sort((a, b) => (b.diasUltimoAcesso ?? 99999) - (a.diasUltimoAcesso ?? 99999))
  }, [usuarios, busca, status, dr.limiarOcioso, dr.limiarInativo])

  useSubtitulo(usuarios ? `${usuarios.length} contas · ${filtrados?.length ?? 0} nesta seleção` : 'Conectando com a Microsoft…')

  async function confirmarCriacao() {
    setNovaConta((f) => ({ ...f, criando: true, erro: null }))
    try {
      const senha = gerarSenhaTemporaria()
      const nome = novaConta.nome.trim()
      const upn = novaConta.upn.trim()
      await dr.criarUsuario({ nome, upn, senha })
      toast('Conta criada no Microsoft 365: ' + upn)
      setNovaConta((f) => ({ ...f, criando: false, confirmando: false, criado: { upn, senha } }))
    } catch (e: any) {
      setNovaConta((f) => ({ ...f, criando: false, erro: e && e.message ? e.message : 'Não foi possível criar a conta.' }))
    }
  }

  function fecharNovaConta() {
    setNovaConta(NOVA_CONTA_INICIAL)
  }

  async function confirmarRedefinicao() {
    if (!acaoSenha) return
    setAcaoSenha((a) => (a ? { ...a, executando: true, erro: null } : a))
    try {
      const senha = await dr.redefinirSenha(acaoSenha.usuario.id)
      toast('Senha redefinida para ' + acaoSenha.usuario.nome)
      setAcaoSenha((a) => (a ? { ...a, executando: false, senha } : a))
    } catch (e: any) {
      setAcaoSenha((a) => (a ? { ...a, executando: false, erro: e && e.message ? e.message : 'Não foi possível redefinir a senha.' } : a))
    }
  }

  async function confirmarSituacao() {
    if (!acaoSituacao) return
    setAcaoSituacao((a) => (a ? { ...a, executando: true, erro: null } : a))
    try {
      await dr.alternarSituacao(acaoSituacao.usuario.id, acaoSituacao.habilitarPara)
      toast(`Conta de ${acaoSituacao.usuario.nome} ${acaoSituacao.habilitarPara ? 'reativada' : 'desativada'}`)
      setAcaoSituacao(null)
    } catch (e: any) {
      setAcaoSituacao((a) => (a ? { ...a, executando: false, erro: e && e.message ? e.message : 'Não foi possível alterar a conta.' } : a))
    }
  }

  if (dr.erroConexao) return <Erro mensagem={dr.erroConexao} aoTentarNovamente={dr.conectar} />
  if (dr.conectando || !usuarios) {
    return dr.erroUsuarios ? <Erro mensagem={dr.erroUsuarios} /> : <Carregando texto="Lendo contas do Microsoft 365…" />
  }

  return (
    <>
      <div className={estilos.toolbar}>
        <div className={estilos.search}>
          <IconeBusca />
          <input placeholder="Buscar por nome ou e-mail" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>

        <button className="btn btn-primary" onClick={() => setNovaConta((f) => ({ ...f, aberto: true }))}>
          <IconeNovaConta />
          Nova conta
        </button>
      </div>

      <div className={estilos.toolbar}>
        <div className={estilos.chips}>
          {STATUS.map(([chave, rotulo]) => (
            <button key={chave} className={`${estilos.chip} ${status === chave ? estilos.on : ''}`} onClick={() => setStatus(chave)}>
              {rotulo}
            </button>
          ))}
        </div>
      </div>

      {novaConta.aberto && (
        <section className="card" style={{ marginBottom: 16, padding: 16 }}>
          <h3>Criar conta real no Microsoft 365</h3>
          <p className="muted" style={{ fontSize: 12 }}>
            Grava de verdade no tenant via Microsoft Graph. Só funciona se sua conta tiver papel de administrador.
          </p>

          {novaConta.criado ? (
            <div style={{ marginTop: 12 }}>
              <p style={{ color: 'var(--verde, #4ade80)' }}>Conta criada com sucesso!</p>
              <p>
                UPN: <b>{novaConta.criado.upn}</b>
              </p>
              <p>
                Senha temporária: <b style={{ fontFamily: 'monospace' }}>{novaConta.criado.senha}</b>
              </p>
              <p className="muted" style={{ fontSize: 12 }}>
                Copie agora e envie com segurança: ela não aparece novamente. A conta exige troca de senha no
                primeiro login.
              </p>
              <button className="btn" onClick={fecharNovaConta} style={{ marginTop: 8 }}>
                Fechar
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 420 }}>
              <label>
                Nome completo
                <input
                  className="input"
                  style={{ width: '100%', marginTop: 4 }}
                  value={novaConta.nome}
                  onChange={(e) => setNovaConta((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex.: Maria Souza"
                />
              </label>
              <label>
                E-mail / UPN completo
                <input
                  className="input"
                  style={{ width: '100%', marginTop: 4 }}
                  value={novaConta.upn}
                  onChange={(e) => setNovaConta((f) => ({ ...f, upn: e.target.value }))}
                  placeholder="Ex.: maria.souza@nefroclinicas.com.br"
                />
              </label>

              {novaConta.erro && <p style={{ color: 'var(--rose)' }}>{novaConta.erro}</p>}

              {!novaConta.confirmando ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-primary"
                    disabled={!novaConta.nome.trim() || !novaConta.upn.trim().includes('@')}
                    onClick={() => setNovaConta((f) => ({ ...f, confirmando: true }))}
                  >
                    Continuar
                  </button>
                  <button className="btn" onClick={fecharNovaConta}>
                    Cancelar
                  </button>
                </div>
              ) : (
                <div style={{ background: 'rgba(244,63,94,0.1)', padding: 12, borderRadius: 8 }}>
                  <p>
                    Confirma a criação da conta real <b>{novaConta.upn.trim()}</b> no Microsoft 365? Essa ação
                    grava no tenant de verdade e não tem um botão de "desfazer" automático.
                  </p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button className="btn btn-primary" onClick={confirmarCriacao} disabled={novaConta.criando}>
                      {novaConta.criando ? 'Criando...' : 'Sim, criar agora'}
                    </button>
                    <button className="btn" onClick={() => setNovaConta((f) => ({ ...f, confirmando: false }))} disabled={novaConta.criando}>
                      Voltar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {filtrados && (
        <div className={estilos.tableCard}>
          <div className={estilos.rolagem}>
            <table>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Usuário</th>
                  <th style={{ textAlign: 'left' }}>Licenças</th>
                  <th>Último acesso</th>
                  <th>MFA</th>
                  <th>OneDrive</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={estilos.vazio}>
                      <b>Nenhuma conta com esses filtros</b>
                      <span className="muted" style={{ fontSize: 13 }}>
                        Limpe a busca ou escolha outro status.
                      </span>
                    </td>
                  </tr>
                ) : (
                  filtrados.map((u) => {
                    const mfaConta = dr.mapaMfa.get(u.upn.toLowerCase())
                    const gb = dr.mapaArmazenamento.get(u.upn.toLowerCase())
                    const st = diasParaStatus(u.diasUltimoAcesso, dr.limiarOcioso, dr.limiarInativo)
                    return (
                      <tr key={u.id}>
                        <td>
                          <div className="person">
                            <div className="av">{iniciais(u.nome)}</div>
                            <div>
                              <b>{u.nome}</b>
                              <span>{u.upn}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 12 }}>{dr.nomesLicencasDoUsuario(u)}</td>
                        <td className="mono" style={{ textAlign: 'center' }}>
                          {quando(u.diasUltimoAcesso)}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {mfaConta === undefined ? (
                            <span className="muted">—</span>
                          ) : mfaConta ? (
                            <span className="badge b-ok">Ativo</span>
                          ) : (
                            <span className="badge b-bad">Sem MFA</span>
                          )}
                        </td>
                        <td className="mono" style={{ textAlign: 'center', fontSize: 12 }}>
                          {gb === undefined ? '—' : gb.toFixed(1) + ' GB'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`badge ${BADGE[st].classe}`}>{BADGE[st].rotulo}</span>
                          {!u.habilitada && (
                            <span className="badge b-neutral" style={{ marginLeft: 6 }}>
                              Desativada
                            </span>
                          )}
                        </td>
                        <td>
                          <div className={estilos.acoes} onClick={(e) => e.stopPropagation()}>
                            <button
                              title="Redefinir senha"
                              aria-label={`Redefinir senha de ${u.nome}`}
                              onClick={() => setAcaoSenha({ usuario: u, executando: false, erro: null, senha: null })}
                            >
                              <IconeChave />
                            </button>
                            <button
                              className={u.habilitada ? estilos.perigo : ''}
                              title={u.habilitada ? 'Desativar conta' : 'Reativar conta'}
                              aria-label={`${u.habilitada ? 'Desativar' : 'Reativar'} ${u.nome}`}
                              onClick={() =>
                                setAcaoSituacao({ usuario: u, habilitarPara: !u.habilitada, executando: false, erro: null })
                              }
                            >
                              <IconeInativar />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {acaoSenha && (
        <div style={OVERLAY} onClick={() => !acaoSenha.executando && setAcaoSenha(null)}>
          <div className="card" style={{ padding: 20, maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <h3>Redefinir senha de {acaoSenha.usuario.nome}</h3>
            {acaoSenha.senha ? (
              <>
                <p style={{ marginTop: 10 }}>
                  Nova senha temporária: <b style={{ fontFamily: 'monospace' }}>{acaoSenha.senha}</b>
                </p>
                <p className="muted" style={{ fontSize: 12 }}>
                  Copie agora e envie com segurança: ela não aparece novamente. A conta exige troca no próximo
                  login.
                </p>
                <button className="btn" style={{ marginTop: 8 }} onClick={() => setAcaoSenha(null)}>
                  Fechar
                </button>
              </>
            ) : (
              <>
                <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
                  Isso grava uma senha temporária nova de verdade no Microsoft 365 para <b>{acaoSenha.usuario.upn}</b>,
                  com troca obrigatória no próximo login.
                </p>
                {acaoSenha.erro && <p style={{ color: 'var(--rose)' }}>{acaoSenha.erro}</p>}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-primary" onClick={confirmarRedefinicao} disabled={acaoSenha.executando}>
                    {acaoSenha.executando ? 'Redefinindo...' : 'Sim, redefinir agora'}
                  </button>
                  <button className="btn" onClick={() => setAcaoSenha(null)} disabled={acaoSenha.executando}>
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {acaoSituacao && (
        <div style={OVERLAY} onClick={() => !acaoSituacao.executando && setAcaoSituacao(null)}>
          <div className="card" style={{ padding: 20, maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <h3>
              {acaoSituacao.habilitarPara ? 'Reativar' : 'Desativar'} conta de {acaoSituacao.usuario.nome}
            </h3>
            <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
              Isso {acaoSituacao.habilitarPara ? 'reativa' : 'desativa'} de verdade a conta{' '}
              <b>{acaoSituacao.usuario.upn}</b> no Microsoft 365
              {acaoSituacao.habilitarPara ? '' : ' (a pessoa não conseguirá mais entrar)'}.
            </p>
            {acaoSituacao.erro && <p style={{ color: 'var(--rose)' }}>{acaoSituacao.erro}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button className="btn btn-primary" onClick={confirmarSituacao} disabled={acaoSituacao.executando}>
                {acaoSituacao.executando ? 'Aplicando...' : `Sim, ${acaoSituacao.habilitarPara ? 'reativar' : 'desativar'} agora`}
              </button>
              <button className="btn" onClick={() => setAcaoSituacao(null)} disabled={acaoSituacao.executando}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
