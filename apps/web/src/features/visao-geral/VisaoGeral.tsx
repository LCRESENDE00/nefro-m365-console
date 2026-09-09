import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Carregando, Erro } from '../../components/Estado'
import { useSubtitulo } from '../../layout/pagina'
import { diasParaStatus, useDadosReais } from '../../lib/dadosReais'
import { BADGE, iniciais, nomeTitulo, quando } from '../../lib/formato'

function dataCurta(iso: string | null): string {
if (!iso) return 'Nunca acessou'
return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
export function VisaoGeral() {
  const navegar = useNavigate()
  const dr = useDadosReais()
  const usuarios = dr.usuarios
 const [unidadesAbertas, setUnidadesAbertas] = useState(new Set())
 const [verTodasUnidades, setVerTodasUnidades] = useState(false)

  const licenciados = useMemo(() => (usuarios ? usuarios.filter((u) => u.totalLicencas > 0) : null), [usuarios])

  const contagem = useMemo(() => {
    const c = { ativo: 0, ocioso: 0, inativo: 0, nunca: 0 }
    if (licenciados) {
      for (const u of licenciados) c[diasParaStatus(u.diasUltimoAcesso, dr.limiarOcioso, dr.limiarInativo)]++
    }
    return c
  }, [licenciados, dr.limiarOcioso, dr.limiarInativo])

  const semMfa = licenciados ? licenciados.filter((u) => dr.mapaMfa.get(u.upn.toLowerCase()) === false).length : null

 const licencasOrdenadas = useMemo(() => [...dr.licencas].sort((a, b) => b.emUso - a.emUso), [dr.licencas])

 const departamentosPorSku = useMemo(() => {
  const mapa = new Map()
  for (const u of usuarios ?? []) {
   const unidade = u.departamento && u.departamento.trim() ? u.departamento.trim() : 'Sem unidade definida'
   for (const skuId of u.skuIds) {
    if (!mapa.has(skuId)) mapa.set(skuId, new Map())
    const porUnidade = mapa.get(skuId)
    porUnidade.set(unidade, (porUnidade.get(unidade) ?? 0) + 1)
   }
  }
  return mapa
 }, [usuarios])

 function tooltipUnidades(skuId: string): string {
  const porUnidade = departamentosPorSku.get(skuId)
  if (!porUnidade || porUnidade.size === 0) return 'sem contas com essa licenca'
  return [...porUnidade.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([unidade, qtd]) => `${unidade}: ${qtd}`)
  .join('\n')
 }
 


  const revisaoPorUnidade = useMemo(() => {
 if (!licenciados) return []
 const pendentes = licenciados.filter((u) => diasParaStatus(u.diasUltimoAcesso, dr.limiarOcioso, dr.limiarInativo) !== 'ativo')
const grupos = new Map()
 for (const u of pendentes) {
 const chave = u.departamento && u.departamento.trim() ? u.departamento.trim() : 'Sem unidade definida'
if (!grupos.has(chave)) grupos.set(chave, [])
 grupos.get(chave).push(u)
 }
return [...grupos.entries()]
 .map(([unidade, contas]) => ({ unidade, contas: [...contas].sort((a, b) => (b.diasUltimoAcesso ?? 99999) - (a.diasUltimoAcesso ?? 99999)) }))
 .sort((a, b) => b.contas.length - a.contas.length)
}, [licenciados, dr.limiarOcioso, dr.limiarInativo])
 const totalPendentes = useMemo(() => revisaoPorUnidade.reduce((soma, g) => soma + g.contas.length, 0), [revisaoPorUnidade])
const unidadesExibidas = verTodasUnidades ? revisaoPorUnidade : revisaoPorUnidade.slice(0, 5)
 function alternarUnidade(unidade: string) {
setUnidadesAbertas((prev) => {
 const novo = new Set(prev)
 if (novo.has(unidade)) novo.delete(unidade)
else novo.add(unidade)
 return novo
 })
 }
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
         {licencasOrdenadas.map((sku) => (
            <div className="srow" key={sku.skuId} title={tooltipUnidades(sku.skuId)}>
<div className="nm">{nomeTitulo(sku.nome)}</div>
            <div className="bar">
                <i style={{ width: `${(sku.emUso / maiorLicenca) * 100}%`, background: 'var(--accent)' }} />
              </div>
              <div className="gb">
               {sku.provavelAutosservico ? `${sku.emUso} em uso (gratuita)` : `${sku.emUso}/${sku.comprados}`}
              </div>
            </div>
          ))}
        </div>
       
             <div className="card">
                     <div className="card-h">
                          <h3>Precisam de revisão</h3>
 <span className="muted" style={{ fontSize: 12, marginLeft: 'auto', marginRight: 10 }} title={totalPendentes + ' conta(s) ao todo'}>{totalPendentes} no total</span>
            <button className="act" onClick={() => navegar('/usuarios')}>
              Ver todos
            </button>
          </div>
{unidadesExibidas.length === 0 ? (
<p className="muted" style={{ fontSize: 13 }}>
Nenhuma conta ociosa ou inativa nesta janela.
</p>
) : (
<>
{unidadesExibidas.map((g) => {
const aberta = unidadesAbertas.has(g.unidade)
return (
<div key={g.unidade} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
<div onClick={() => alternarUnidade(g.unidade)} title={g.contas.length + " conta(s) em " + g.unidade} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 2px", cursor: "pointer" }}>
<span>{aberta ? "▾" : "▸"} <b>{g.unidade}</b></span>
<span className="badge b-neutral">{g.contas.length}</span>
</div>
{aberta && g.contas.map((u) => (
<div key={u.upn} className="srow" style={{ cursor: "pointer" }} onClick={() => navegar("/usuarios")}>
<div className="person" style={{ flex: 1, minWidth: 0 }}>
<div className="av">{iniciais(nomeTitulo(u.nome))}</div>
<div style={{ minWidth: 0 }}>
<b>{nomeTitulo(u.nome)}</b>
<span>{u.upn}</span>
</div>
</div>
<div style={{ textAlign: "right" }}>
<span className={`badge ${BADGE[diasParaStatus(u.diasUltimoAcesso, dr.limiarOcioso, dr.limiarInativo)].classe}`}>{quando(u.diasUltimoAcesso)}</span>
<div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{dataCurta(u.ultimoAcessoIso)}</div>
</div>
</div>
))}
</div>
)
})}
{revisaoPorUnidade.length > 5 && (
<button className="btn" style={{ marginTop: 10 }} onClick={() => setVerTodasUnidades((v) => !v)}>
{verTodasUnidades ? "Ver menos unidades" : "Ver todas as unidades (" + revisaoPorUnidade.length + ")"}
</button>
)}
</>
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
