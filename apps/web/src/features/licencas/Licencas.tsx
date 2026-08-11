import { useNavigate } from 'react-router-dom'
import { Carregando, Erro } from '../../components/Estado'
import { useToast } from '../../components/Toast'
import { IconeExportar } from '../../components/icones'
import { useSubtitulo } from '../../layout/pagina'
import { baixar } from '../../lib/baixar'
import { useDadosReais } from '../../lib/dadosReais'
import estilos from './Licencas.module.css'

function celulaCsv(valor: string | number): string {
  const texto = String(valor ?? '')
  if (/[",\n;]/.test(texto)) return '"' + texto.replace(/"/g, '""') + '"'
  return texto
}

function linhasParaCsv(linhas: (string | number)[][]): string {
  return linhas.map((linha) => linha.map(celulaCsv).join(',')).join('\n')
}

export function Licencas() {
  const navegar = useNavigate()
  const toast = useToast()
  const dr = useDadosReais()

  useSubtitulo(
    dr.licencas.length
      ? `${dr.licencas.length} planos · ${dr.licencas.filter((p) => !p.provavelAutosservico).reduce((s, p) => s + p.comprados, 0)} licenças contratadas`
      : 'Conectando com a Microsoft…',
  )

  if (dr.erroConexao) return <Erro mensagem={dr.erroConexao} aoTentarNovamente={dr.conectar} />
  if (dr.conectando && dr.licencas.length === 0) return <Carregando texto="Lendo licenças do Microsoft 365…" />

  const licencasPagas = dr.licencas.filter((p) => !p.provavelAutosservico)
 const totalComprados = licencasPagas.reduce((s, p) => s + p.comprados, 0)
  const totalEmUso = licencasPagas.reduce((s, p) => s + p.emUso, 0)
  const totalLivres = licencasPagas.reduce((s, p) => s + p.livres, 0)
 const licencasAutosservico = dr.licencas.filter((p) => p.provavelAutosservico)

  function exportarPlanilha() {
    const linhas: (string | number)[][] = []
    linhas.push(['LICENÇAS REAIS (Microsoft Graph)'])
    linhas.push(['Licença', 'Código técnico', 'Comprados', 'Em uso', 'Livres'])
    for (const sku of dr.licencas) linhas.push([sku.nome, sku.skuPartNumber, sku.comprados, sku.emUso, sku.livres])

    if (dr.usuarios) {
      linhas.push([])
      linhas.push(['USUÁRIOS E LICENÇAS (Microsoft Graph)'])
      linhas.push(['Nome', 'UPN', 'Licenças'])
      for (const u of dr.usuarios) linhas.push([u.nome, u.upn, dr.nomesLicencasDoUsuario(u)])
    }

    const csv = '\uFEFF' + linhasParaCsv(linhas)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const agora = new Date().toISOString().slice(0, 10)
    const nome = 'licencas-m365-' + agora + '.csv'
    baixar({ nome, conteudo: blob })
    toast('Planilha gerada: ' + nome)
  }

  return (
    <>
      <div className={estilos.toolbar ?? ''} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn" onClick={exportarPlanilha}>
          <IconeExportar />
          Exportar planilha (CSV)
        </button>
      </div>

      <div className="grid g3" style={{ marginBottom: 16 }}>
        <div className="card kpi">
          <div className="label">Licenças contratadas</div>
          <div className="v">{totalComprados}</div>
        <div className="d">em {licencasPagas.length} planos pagos (de {dr.licencas.length} no total)</div>
        </div>
        <div className="card kpi">
          <div className="label">Em uso</div>
          <div className="v">{totalEmUso}</div>
          <div className="d">atribuídos a alguma conta</div>
        </div>
        <div className="card kpi">
          <div className="label">Livres</div>
          <div className="v" style={{ color: 'var(--teal)' }}>
            {totalLivres}
          </div>
          <div className="d">contratados e nunca atribuídos</div>
        </div>
      </div>

      <div className="grid g2">
        {dr.licencas.map((sku) => (
          <div className={estilos.lic} key={sku.skuId}>
            <div className={estilos.top}>
              <div>
                <h4>{sku.nome}</h4>
                <span className="muted" style={{ fontSize: 12.3 }}>
                {sku.skuPartNumber} {sku.provavelAutosservico && <b style={{ color: 'var(--amber)' }}> · gratuita/autoatribuída</b>}
                </span>
              </div>
              <div className={estilos.price}>
                <b>{sku.comprados}</b>
                <div className="muted" style={{ fontSize: 11.5 }}>
                  licenças
                </div>
              </div>
            </div>

            <div className={estilos.seats}>
              <span style={{ width: `${sku.comprados ? (sku.emUso / sku.comprados) * 100 : 0}%`, background: 'var(--accent)' }} />
              <span style={{ width: `${sku.comprados ? (sku.livres / sku.comprados) * 100 : 0}%`, background: 'var(--surface-3)' }} />
            </div>

            <div className={estilos.legenda}>
              <span>
                <i style={{ background: 'var(--accent)' }} />
                {sku.emUso} em uso
              </span>
              <span>
                <i style={{ background: 'var(--surface-3)' }} />
                {sku.livres} livres
              </span>
            </div>

            <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={() => navegar('/usuarios')}>
              Ver contas com essa licença
            </button>
          </div>
        ))}
      </div>
    <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>{licencasAutosservico.length > 0 ? licencasAutosservico.length + ' licença(s) gratuita(s)/autoatribuída(s) (testes e planos viral) foram excluídas dos totais acima porque a Microsoft libera uma cota enorme de vagas para elas, o que distorceria os números. ' : ''}O Microsoft Graph não informa o valor pago por licença — não dá pra trazer custo aqui sem acesso ao faturamento do Microsoft 365, que não está liberado com as permissões atuais.</p>
    </>
  )
}
