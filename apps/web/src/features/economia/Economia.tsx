import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Carregando, Erro } from '../../components/Estado'
import { useToast } from '../../components/Toast'
import { IconeExportar } from '../../components/icones'
import { useSubtitulo } from '../../layout/pagina'
import { baixar } from '../../lib/baixar'
import { blobCsv } from '../../lib/csv'
import { useDadosReais } from '../../lib/dadosReais'
import { calcularEconomia, MOTIVO, type MotivoRecuperacao } from '../../lib/economia'
import { iniciais, money, money0, nomeTitulo, numero, quando } from '../../lib/formato'
import { interpretarPreco, PRECOS_PADRAO, usePrecos } from '../../lib/precos'
import { rotuloUnidade } from '../../lib/regioes'
import estilos from './Economia.module.css'

type Filtro = 'certas' | MotivoRecuperacao | 'todas'

const FILTROS: Array<[Filtro, string]> = [
  ['certas', 'Redução certa'],
  ['desativada', 'Desativadas'],
  ['nunca', 'Nunca acessaram'],
  ['inativa', 'Inativas'],
  ['ociosa', 'Ociosas (a revisar)'],
  ['todas', 'Todas'],
]

const LIMITE_INICIAL = 25

const formatarPreco = (valor: number) =>
  valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Campo "R$ 0,00" que só grava quando a pessoa sai dele ou aperta Enter. */
function EntradaPreco({ valor, aoDefinir }: { valor: number | null; aoDefinir: (valor: number | null) => void }) {
  const [texto, setTexto] = useState(valor === null ? '' : formatarPreco(valor))
  const [editando, setEditando] = useState(false)

  useEffect(() => {
    if (!editando) setTexto(valor === null ? '' : formatarPreco(valor))
  }, [valor, editando])

  return (
    <label className={`${estilos.precoWrap} ${valor === null ? estilos.semValor : ''}`} title="Valor mensal por licença, conforme a fatura">
      R$
      <input
        inputMode="decimal"
        placeholder="informar"
        aria-label="Valor unitário mensal"
        value={texto}
        onFocus={() => setEditando(true)}
        onChange={(e) => setTexto(e.target.value)}
        onBlur={() => {
          setEditando(false)
          aoDefinir(interpretarPreco(texto))
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
      />
    </label>
  )
}

export function Economia() {
  const navegar = useNavigate()
  const toast = useToast()
  const dr = useDadosReais()
  const { precos, definirPreco, restaurarPadrao } = usePrecos()
  const [filtro, setFiltro] = useState<Filtro>('certas')
  const [verTodas, setVerTodas] = useState(false)

  const resumo = useMemo(
    () => calcularEconomia(dr.licencas, dr.usuarios, precos, { limiarOcioso: dr.limiarOcioso, limiarInativo: dr.limiarInativo }),
    [dr.licencas, dr.usuarios, precos, dr.limiarOcioso, dr.limiarInativo],
  )

  const contasFiltradas = useMemo(() => {
    if (filtro === 'todas') return resumo.contas
    if (filtro === 'certas') return resumo.contas.filter((c) => MOTIVO[c.motivo].certa)
    return resumo.contas.filter((c) => c.motivo === filtro)
  }, [resumo.contas, filtro])

  const contagemPorFiltro = useMemo(() => {
    const c: Record<Filtro, number> = { certas: 0, desativada: 0, nunca: 0, inativa: 0, ociosa: 0, todas: resumo.contas.length }
    for (const conta of resumo.contas) {
      c[conta.motivo]++
      if (MOTIVO[conta.motivo].certa) c.certas++
    }
    return c
  }, [resumo.contas])

  const contasExibidas = verTodas ? contasFiltradas : contasFiltradas.slice(0, LIMITE_INICIAL)
  const valorFiltrado = contasFiltradas.reduce((s, c) => s + c.valorMensal, 0)

  useSubtitulo(
    dr.licencas.length
      ? `${numero(resumo.totalRecuperaveis)} licenças paradas · ${money(resumo.economiaMensal)} por mês · ${money0(resumo.economiaAnual)} por ano`
      : 'Conectando com a Microsoft…',
  )

  if (dr.erroConexao) return <Erro mensagem={dr.erroConexao} aoTentarNovamente={dr.conectar} />
  if (dr.conectando && dr.licencas.length === 0) return <Carregando texto="Lendo licenças e contas do Microsoft 365…" />

  function exportarPlanilha() {
    const linhas: (string | number)[][] = []
    linhas.push(['ECONOMIA POR TIPO DE LICENÇA'])
    linhas.push([
      'Licença',
      'Código técnico',
      'Valor unitário (R$/mês)',
      'Contratadas',
      'Em uso',
      'Livres',
      'Em contas desativadas',
      'Em contas que nunca acessaram',
      'Em contas inativas',
      'Recuperáveis',
      'Economia mensal (R$)',
      'Economia anual (R$)',
      'Em contas ociosas (a revisar)',
      'Potencial adicional (R$/mês)',
    ])
    for (const p of resumo.planos) {
      linhas.push([
        p.nome,
        p.skuPartNumber,
        p.preco === null ? '' : p.preco.toFixed(2),
        p.comprados,
        p.emUso,
        p.livres,
        p.desativadas,
        p.nunca,
        p.inativas,
        p.recuperaveis,
        p.economiaMensal.toFixed(2),
        (p.economiaMensal * 12).toFixed(2),
        p.ociosas,
        p.potencialOciosas.toFixed(2),
      ])
    }
    linhas.push(['TOTAL', '', '', '', '', resumo.totalLivres, '', '', '', resumo.totalRecuperaveis, resumo.economiaMensal.toFixed(2), resumo.economiaAnual.toFixed(2), '', resumo.potencialOciosas.toFixed(2)])

    linhas.push([])
    linhas.push(['CONTAS COM LICENÇAS PARADAS'])
    linhas.push(['Nome', 'UPN', 'Unidade', 'Situação', 'Último acesso', 'Dias sem acesso', 'Licenças pagas', 'Valor mensal (R$)'])
    for (const c of resumo.contas) {
      linhas.push([
        c.usuario.nome,
        c.usuario.upn,
        rotuloUnidade(c.usuario.departamento),
        MOTIVO[c.motivo].rotulo,
        c.usuario.ultimoAcessoIso ? c.usuario.ultimoAcessoIso.slice(0, 10) : 'nunca',
        c.usuario.diasUltimoAcesso ?? '',
        c.licencas.map((l) => l.nome).join(' + '),
        c.valorMensal.toFixed(2),
      ])
    }

    const agora = new Date().toISOString().slice(0, 10)
    const nome = 'economia-licencas-m365-' + agora + '.csv'
    baixar({ nome, conteudo: blobCsv(linhas) })
    toast('Planilha gerada: ' + nome)
  }

  const valorOuTraco = (valor: number, classe = '') =>
    valor > 0 ? <span className={classe}>{money(valor)}</span> : <span className={estilos.zero}>—</span>

  const contagem = (n: number) => (n > 0 ? n : <span className={estilos.zero}>0</span>)

  return (
    <>
      <div className="grid g4">
        <div className="card kpi">
          <div className="label">Economia mensal</div>
          <div className="v" style={{ color: 'var(--teal)' }}>
            {money(resumo.economiaMensal)}
          </div>
          <div className="d">removendo {numero(resumo.totalRecuperaveis)} licenças paradas</div>
        </div>
        <div className="card kpi">
          <div className="label">Economia anual</div>
          <div className="v" style={{ color: 'var(--teal)' }}>
            {money0(resumo.economiaAnual)}
          </div>
          <div className="d">12 meses sem essas licenças</div>
        </div>
        <div className="card kpi">
          <div className="label">Licenças paradas</div>
          <div className="v">{numero(resumo.totalRecuperaveis)}</div>
          <div className="d">
            {numero(resumo.totalLivres)} nunca atribuídas · {numero(resumo.totalRecuperaveis - resumo.totalLivres)} em {numero(resumo.contasCertas)} contas paradas
          </div>
        </div>
        <div className="card kpi">
          <div className="label">Potencial adicional</div>
          <div className="v" style={{ color: 'var(--amber)' }}>
            {money(resumo.potencialOciosas)}
          </div>
          <div className="d">
            por mês em {numero(resumo.contasOciosas)} contas ociosas ({dr.limiarOcioso + 1}–{dr.limiarInativo} dias), a revisar
          </div>
        </div>
      </div>

      {dr.usuarios === null && !dr.conectando && (
        <p className={estilos.nota} style={{ marginTop: 16 }}>
          Não deu pra ler as contas ({dr.erroUsuarios ?? 'sem resposta da Microsoft'}) — por enquanto a economia considera só as licenças contratadas e nunca atribuídas.
        </p>
      )}

      <div className={estilos.tabelaCard} style={{ marginTop: 16 }}>
        <div className={estilos.cabecalho}>
          <h3>Economia por tipo de licença</h3>
          <span className="muted" style={{ fontSize: 12 }}>
            {resumo.planos.length} planos pagos
            {resumo.planosSemValor > 0 ? ` · ${resumo.planosSemValor} sem valor informado` : ''}
          </span>
          <div className={estilos.acoes}>
            <button className="btn" onClick={restaurarPadrao} title="Volta aos valores da fatura para Business Basic e Business Standard">
              Restaurar valores da fatura
            </button>
            <button className="btn" onClick={exportarPlanilha}>
              <IconeExportar />
              Exportar planilha (CSV)
            </button>
          </div>
        </div>

        <div className={estilos.rolagem}>
          <table>
            <thead>
              <tr>
                <th>Licença</th>
                <th>Valor unit./mês</th>
                <th className={estilos.num}>Contratadas</th>
                <th className={estilos.num}>Livres</th>
                <th className={estilos.num}>Desativadas</th>
                <th className={estilos.num}>Nunca acessaram</th>
                <th className={estilos.num}>Inativas</th>
                <th className={estilos.num}>Recuperáveis</th>
                <th className={estilos.num}>Economia/mês</th>
                <th className={estilos.num} title="Contas ociosas: ainda precisam de revisão antes de qualquer corte">
                  Ociosas
                </th>
              </tr>
            </thead>
            <tbody>
              {resumo.planos.length === 0 ? (
                <tr>
                  <td colSpan={10} className={estilos.vazio}>
                    Nenhum plano pago encontrado no Microsoft 365.
                  </td>
                </tr>
              ) : (
                resumo.planos.map((p) => (
                  <tr key={p.skuId}>
                    <td className={estilos.plano}>
                      <b>{nomeTitulo(p.nome)}</b>
                      <span>{p.skuPartNumber}</span>
                    </td>
                    <td>
                      <EntradaPreco valor={p.preco} aoDefinir={(valor) => definirPreco(p.skuPartNumber, valor)} />
                    </td>
                    <td className={estilos.num}>
                      {p.emUso}/{p.comprados}
                    </td>
                    <td className={estilos.num}>{contagem(p.livres)}</td>
                    <td className={estilos.num}>{contagem(p.desativadas)}</td>
                    <td className={estilos.num}>{contagem(p.nunca)}</td>
                    <td className={estilos.num}>{contagem(p.inativas)}</td>
                    <td className={estilos.num}>
                      <b>{contagem(p.recuperaveis)}</b>
                    </td>
                    <td className={estilos.num}>
                      {valorOuTraco(p.economiaMensal, estilos.destaque)}
                      {p.economiaMensal > 0 && <span className={estilos.anual}>{money0(p.economiaMensal * 12)}/ano</span>}
                    </td>
                    <td className={estilos.num}>
                      {p.ociosas > 0 ? (
                        <span title={money(p.potencialOciosas) + '/mês se removidas'}>
                          {p.ociosas}
                          {p.potencialOciosas > 0 && <span className={estilos.anual}>{money0(p.potencialOciosas)}/mês</span>}
                        </span>
                      ) : (
                        <span className={estilos.zero}>0</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {resumo.planos.length > 0 && (
              <tfoot>
                <tr className={estilos.total}>
                  <td colSpan={3}>Total</td>
                  <td className={estilos.num}>{resumo.totalLivres}</td>
                  <td className={estilos.num}>{resumo.planos.reduce((s, p) => s + p.desativadas, 0)}</td>
                  <td className={estilos.num}>{resumo.planos.reduce((s, p) => s + p.nunca, 0)}</td>
                  <td className={estilos.num}>{resumo.planos.reduce((s, p) => s + p.inativas, 0)}</td>
                  <td className={estilos.num}>{resumo.totalRecuperaveis}</td>
                  <td className={`${estilos.num} ${estilos.destaque}`}>
                    {money(resumo.economiaMensal)}
                    <span className={estilos.anual}>{money0(resumo.economiaAnual)}/ano</span>
                  </td>
                  <td className={estilos.num}>
                    {resumo.planos.reduce((s, p) => s + p.ociosas, 0)}
                    <span className={estilos.anual}>{money0(resumo.potencialOciosas)}/mês</span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div className={`${estilos.tabelaCard} ${estilos.contas}`} style={{ marginTop: 16 }}>
        <div className={estilos.cabecalho}>
          <h3>Contas com licenças paradas</h3>
          <span className="muted" style={{ fontSize: 12 }}>
            {contasFiltradas.length} contas · {money(valorFiltrado)}/mês
          </span>
          <div className={estilos.acoes}>
            <div className={estilos.chips} role="group" aria-label="Filtrar contas">
              {FILTROS.map(([chave, rotulo]) => (
                <button
                  key={chave}
                  className={`${estilos.chip} ${filtro === chave ? estilos.on : ''}`}
                  onClick={() => {
                    setFiltro(chave)
                    setVerTodas(false)
                  }}
                >
                  {rotulo}
                  <small>{contagemPorFiltro[chave]}</small>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={estilos.rolagem}>
          <table>
            <thead>
              <tr>
                <th>Conta</th>
                <th>Unidade</th>
                <th>Licenças pagas</th>
                <th>Último acesso</th>
                <th>Situação</th>
                <th className={estilos.num}>R$/mês</th>
              </tr>
            </thead>
            <tbody>
              {contasExibidas.length === 0 ? (
                <tr>
                  <td colSpan={6} className={estilos.vazio}>
                    {dr.usuarios === null ? 'As contas ainda não foram lidas.' : 'Nenhuma conta nessa situação.'}
                  </td>
                </tr>
              ) : (
                contasExibidas.map((c) => {
                  const u = c.usuario
                  const situacao = MOTIVO[c.motivo]
                  return (
                    <tr key={u.id} onClick={() => navegar('/usuarios?busca=' + encodeURIComponent(u.upn))} title="Abrir na tela de Usuários">
                      <td>
                        <div className="person">
                          <div className="av">{iniciais(nomeTitulo(u.nome))}</div>
                          <div style={{ minWidth: 0 }}>
                            <b>{nomeTitulo(u.nome)}</b>
                            <span>{u.upn}</span>
                          </div>
                        </div>
                      </td>
                      <td>{rotuloUnidade(u.departamento)}</td>
                      <td className={estilos.licencas}>{c.licencas.map((l) => nomeTitulo(l.nome)).join(' + ')}</td>
                      <td className="mono" style={{ fontSize: 12.5 }}>
                        {quando(u.diasUltimoAcesso)}
                      </td>
                      <td>
                        <span className={`badge ${situacao.classe}`}>{situacao.rotulo}</span>
                      </td>
                      <td className={estilos.num}>
                        {c.valorMensal > 0 ? money(c.valorMensal) : <span className={estilos.zero}>—</span>}
                        {c.semValor && (
                          <span className="muted" title="Uma das licenças dessa conta está sem valor informado" style={{ marginLeft: 4 }}>
                            *
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {contasFiltradas.length > LIMITE_INICIAL && (
          <div className={estilos.rodape}>
            Mostrando {contasExibidas.length} de {contasFiltradas.length}
            <button className="btn" style={{ padding: '7px 12px', fontSize: 12.5 }} onClick={() => setVerTodas((v) => !v)}>
              {verTodas ? 'Ver menos' : `Ver todas (${contasFiltradas.length})`}
            </button>
          </div>
        )}
      </div>

      <div className={estilos.notas}>
        <p className={estilos.nota}>
          Valores da fatura (plano anual, pagamento mensal): Business Basic {money(PRECOS_PADRAO.O365_BUSINESS_ESSENTIALS)} e Business Standard{' '}
          {money(PRECOS_PADRAO.O365_BUSINESS_PREMIUM)} por licença. O Microsoft Graph não informa preço, então os demais planos entram na conta só depois
          que o valor unitário for preenchido na tabela — o que você digitar fica salvo neste navegador.
        </p>
        <p className={estilos.nota}>
          Redução certa = licenças nunca atribuídas + contas desativadas, inativas (sem acesso há mais de {dr.limiarInativo} dias) ou que nunca acessaram
          (conta criada há pouco e ainda sem primeiro acesso também aparece aqui — confira antes de cortar). Em contrato anual, a quantidade só cai na
          renovação; até lá, as licenças liberadas dessas contas podem ser reaproveitadas em novas contas em vez de comprar mais.
        </p>
      </div>
    </>
  )
}
