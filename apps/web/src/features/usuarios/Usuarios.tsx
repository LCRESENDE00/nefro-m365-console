import { useMemo, useState, type CSSProperties } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Carregando, Erro } from '../../components/Estado'
import { IconeBusca, IconeChave, IconeInativar, IconeLixeira, IconeNovaConta } from '../../components/icones'
import { useToast } from '../../components/Toast'
import { useSubtitulo } from '../../layout/pagina'
import { descreverUnidade, useCatalogos } from '../../lib/catalogos'
import { diasParaStatus, useDadosReais, type StatusReal } from '../../lib/dadosReais'
import { BADGE, iniciais, nomeTitulo, quando } from '../../lib/formato'
import type { UsuarioReal } from '../../lib/graph'
import { regiaoDaUnidade, rotuloUnidade } from '../../lib/regioes'
import estilos from './Usuarios.module.css'

const STATUS: Array<[StatusReal | 'todos', string]> = [
  ['todos', 'Todos'],
  ['ativo', 'Ativos'],
  ['ocioso', 'Ociosos'],
  ['inativo', 'Inativos'],
  ['nunca', 'Nunca acessaram'],
]

type AcaoSenha = { usuario: UsuarioReal; executando: boolean; erro: string | null; senha: string | null }
type AcaoSituacao = { usuario: UsuarioReal; habilitarPara: boolean; executando: boolean; erro: string | null }
type AcaoLicencas = { usuario: UsuarioReal; executando: boolean; erro: string | null; removidas: boolean }

const OVERLAY: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'var(--scrim)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 50,
  padding: 16,
}

export function Usuarios() {
  const dr = useDadosReais()
  const toast = useToast()
  const navegar = useNavigate()
  const { catalogos } = useCatalogos()
  const [parametros] = useSearchParams()
  const [busca, setBusca] = useState(parametros.get('busca') ?? '')
  const [status, setStatus] = useState<StatusReal | 'todos'>('todos')
 const [regiao, setRegiao] = useState('todas')
 const [unidade, setUnidade] = useState('todas')
 const [tipoLicenca, setTipoLicenca] = useState('todas')
 const [tipoConta, setTipoConta] = useState('todas')
  const [acaoSenha, setAcaoSenha] = useState<AcaoSenha | null>(null)
  const [acaoSituacao, setAcaoSituacao] = useState<AcaoSituacao | null>(null)
 const [acaoLicencas, setAcaoLicencas] = useState<AcaoLicencas | null>(null)

  const usuarios = dr.usuarios

  const filtrados = useMemo(() => {
    if (!usuarios) return null
    const termo = busca.trim().toLowerCase()
    return usuarios
      .filter((u) => !termo || u.nome.toLowerCase().includes(termo) || u.upn.toLowerCase().includes(termo))
      .filter((u) => status === 'todos' || diasParaStatus(u.diasUltimoAcesso, dr.limiarOcioso, dr.limiarInativo) === status)
 .filter((u) => regiao === 'todas' || regiaoDaUnidade(u.departamento) === regiao)
 .filter((u) => unidade === 'todas' || rotuloUnidade(u.departamento) === unidade)
 .filter((u) => tipoConta === 'todas' || (tipoConta === 'externo' ? u.externo : tipoConta === 'compartilhada' ? u.provavelCaixaCompartilhada : (!u.externo && !u.provavelCaixaCompartilhada)))
 .filter((u) => tipoLicenca === 'todas' || u.skuIds.some((id) => dr.nomesPorSkuId.get(id) === tipoLicenca))
      .sort((a, b) => (b.diasUltimoAcesso ?? 99999) - (a.diasUltimoAcesso ?? 99999))
  }, [usuarios, busca, status, regiao, unidade, tipoLicenca, tipoConta, dr.limiarOcioso, dr.limiarInativo, dr.nomesPorSkuId, catalogos])

 
 const regioesDisponiveis = useMemo(() => [...new Set((usuarios ?? []).map((u) => regiaoDaUnidade(u.departamento)))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [usuarios, catalogos])
 // Com uma região escolhida, o seletor de unidades mostra só as unidades daquela região.
 const unidadesDisponiveis = useMemo(
   () => [...new Set((usuarios ?? []).filter((u) => regiao === 'todas' || regiaoDaUnidade(u.departamento) === regiao).map((u) => rotuloUnidade(u.departamento)))].sort(),
   [usuarios, regiao, catalogos],
 )
 const licencasDisponiveis = useMemo(() => [...new Set((usuarios ?? []).flatMap((u) => u.skuIds.map((id) => dr.nomesPorSkuId.get(id) ?? id)))].sort(), [usuarios, dr.nomesPorSkuId])
  useSubtitulo(usuarios ? `${usuarios.length} contas · ${filtrados?.length ?? 0} nesta seleção` : 'Conectando com a Microsoft…')

  async function confirmarRedefinicao() {
    if (!acaoSenha) return
    setAcaoSenha((a) => (a ? { ...a, executando: true, erro: null } : a))
    try {
      const senha = await dr.redefinirSenha(acaoSenha.usuario.id)
      toast('Senha redefinida para ' + nomeTitulo(acaoSenha.usuario.nome))
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
      toast(`Conta de ${nomeTitulo(acaoSituacao.usuario.nome)} ${acaoSituacao.habilitarPara ? 'reativada' : 'desativada'}`)
      setAcaoSituacao(null)
    } catch (e: any) {
      setAcaoSituacao((a) => (a ? { ...a, executando: false, erro: e && e.message ? e.message : 'Não foi possível alterar a conta.' } : a))
    }
      }
async function confirmarRemocaoLicencas() {
if (!acaoLicencas) return
setAcaoLicencas((a) => (a ? { ...a, executando: true, erro: null } : a))
try {
await dr.removerLicencas(acaoLicencas.usuario.id, acaoLicencas.usuario.skuIds)
toast("Todas as licenças de " + nomeTitulo(acaoLicencas.usuario.nome) + " foram removidas")
setAcaoLicencas((a) => (a ? { ...a, executando: false, removidas: true } : a))
} catch (e: any) {
setAcaoLicencas((a) => (a ? { ...a, executando: false, erro: e && e.message ? e.message : "Não foi possível remover as licenças." } : a))
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

        <button className="btn btn-primary" onClick={() => navegar('/usuarios/nova')}>
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
<div className={estilos.toolbar}>
<select className="sel" value={regiao} onChange={(e) => { setRegiao(e.target.value); setUnidade('todas') }}>
<option value="todas">Todas as regiões</option>
{regioesDisponiveis.map((r) => (<option key={r} value={r}>{r}</option>))}
</select>
<select className="sel" value={unidade} onChange={(e) => setUnidade(e.target.value)}>
<option value="todas">Todas as unidades</option>
{unidadesDisponiveis.map((un) => (<option key={un} value={un}>{descreverUnidade(un) || un}</option>))}
</select>
<select className="sel" value={tipoLicenca} onChange={(e) => setTipoLicenca(e.target.value)}>
<option value="todas">Todos os tipos de licença</option>
{licencasDisponiveis.map((l) => (<option key={l} value={l}>{l}</option>))}
</select>
<select className="sel" value={tipoConta} onChange={(e) => setTipoConta(e.target.value)}>
<option value="todas">Internos e externos</option>
<option value="interno">Somente internos</option>
<option value="externo">Somente externos (convidados)</option>
  <option value="compartilhada">Provável caixa compartilhada</option>
</select>
</div>

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
                            <div className="av">{iniciais(nomeTitulo(u.nome))}</div>
                            <div>
                              <b>{nomeTitulo(u.nome)}</b>
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
<button title="Remover licenças" aria-label={"Remover licenças de " + u.nome} disabled={u.skuIds.length === 0} onClick={() => setAcaoLicencas({ usuario: u, executando: false, erro: null, removidas: false })}>
<IconeLixeira />
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
            <h3>Redefinir senha de {nomeTitulo(acaoSenha.usuario.nome)}</h3>
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
              {acaoSituacao.habilitarPara ? 'Reativar' : 'Desativar'} conta de {nomeTitulo(acaoSituacao.usuario.nome)}
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
{acaoLicencas && (
<div style={OVERLAY} onClick={() => !acaoLicencas.executando && setAcaoLicencas(null)}>
<div className="card" style={{ padding: 20, maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
<h3>Remover licenças de {nomeTitulo(acaoLicencas.usuario.nome)}</h3>
{acaoLicencas.removidas ? (
<>
<p style={{ marginTop: 10, color: "var(--verde, #4ade80)" }}>Todas as licenças foram removidas com sucesso.</p>
<button className="btn" style={{ marginTop: 8 }} onClick={() => setAcaoLicencas(null)}>Fechar</button>
</>
) : (
<>
<p className="muted" style={{ fontSize: 13, marginTop: 8 }}>Isso remove de verdade TODAS as licenças de <b>{acaoLicencas.usuario.upn}</b> no Microsoft 365, inclusive as gratuitas: <b>{dr.nomesLicencasDoUsuario(acaoLicencas.usuario)}</b>.</p>
{acaoLicencas.erro && <p style={{ color: "var(--rose)" }}>{acaoLicencas.erro}</p>}
<div style={{ display: "flex", gap: 8, marginTop: 12 }}>
<button className="btn btn-primary" onClick={confirmarRemocaoLicencas} disabled={acaoLicencas.executando}>
{acaoLicencas.executando ? "Removendo..." : "Sim, remover todas agora"}
</button>
<button className="btn" onClick={() => setAcaoLicencas(null)} disabled={acaoLicencas.executando}>Cancelar</button>
</div>
</>
)}
</div>
</div>
)}
    </>
  )
}
