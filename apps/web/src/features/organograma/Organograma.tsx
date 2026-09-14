import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useToast } from '../../components/Toast'
import { IconeBusca, IconeExportar, IconeOrganograma } from '../../components/icones'
import { useSubtitulo } from '../../layout/pagina'
import { baixar } from '../../lib/baixar'
import { descreverUnidade } from '../../lib/catalogos'
import { blobCsv } from '../../lib/csv'
import { dataHora, iniciais, nomeTitulo, numero } from '../../lib/formato'
import {
  cadeiaDeGestores,
  equipeCompleta,
  importarCsvOrganograma,
  montarHierarquia,
  normalizarNome,
  useOrganograma,
  type Colaborador,
} from '../../lib/organograma'
import estilos from './Organograma.module.css'

/** Entrada da lista que junta quem está na planilha sem gestor informado. */
const SEM_GESTOR = '__sem-gestor__'
const LIMITE_INICIAL = 80

const TODAS = 'todas'

const exibirNome = (pessoa: Colaborador) => nomeTitulo(pessoa.nome)

const coincide = (pessoa: Colaborador, termo: string) =>
  !termo ||
  normalizarNome(pessoa.nome).includes(termo) ||
  normalizarNome(pessoa.cargo).includes(termo) ||
  pessoa.email.toLowerCase().includes(termo.toLowerCase()) ||
  normalizarNome(pessoa.setor).includes(termo)

export function Organograma() {
  const toast = useToast()
  const { organograma, definirOrganograma, limparOrganograma } = useOrganograma()
  const [parametros, setParametros] = useSearchParams()
  const selecionadoId = parametros.get('gestor')
  const [busca, setBusca] = useState('')
  const [regional, setRegional] = useState(TODAS)
  const [equipeInteira, setEquipeInteira] = useState(false)
  const [verTodos, setVerTodos] = useState(false)
  const [arrastando, setArrastando] = useState(false)
  const [importando, setImportando] = useState(false)
  const entradaArquivo = useRef<HTMLInputElement>(null)

  const colaboradores = organograma?.colaboradores ?? []
  const hierarquia = useMemo(() => montarHierarquia(colaboradores), [colaboradores])
  const termo = normalizarNome(busca)
  const naRegional = (pessoa: Colaborador) => regional === TODAS || pessoa.regional === regional

  const regionais = useMemo(
    () => [...new Set(colaboradores.map((c) => c.regional).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [colaboradores],
  )

  const semGestor = useMemo(
    () => colaboradores.filter((c) => c.naPlanilha && !c.gestorId).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [colaboradores],
  )

  /** Gestores da lista da esquerda: os que têm alguém na regional escolhida e batem com a busca (eles ou alguém da equipe). */
  const gestoresVisiveis = useMemo(() => {
    const lista = hierarquia.gestores.map((gestor) => {
      const diretos = (hierarquia.diretos.get(gestor.id) ?? []).filter(naRegional)
      const naEquipe = termo ? diretos.filter((p) => coincide(p, termo)).length : 0
      return { gestor, diretos: diretos.length, naEquipe, proprio: coincide(gestor, termo) }
    })
    return lista.filter((item) => item.diretos > 0 && (!termo || item.proprio || item.naEquipe > 0))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hierarquia, regional, termo])

  const semGestorVisiveis = useMemo(
    () => semGestor.filter(naRegional).filter((p) => coincide(p, termo)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [semGestor, regional, termo],
  )

  const selecionado = selecionadoId && selecionadoId !== SEM_GESTOR ? hierarquia.porId.get(selecionadoId) ?? null : null
  const mostrandoSemGestor = selecionadoId === SEM_GESTOR

  const equipe = useMemo(() => {
    if (mostrandoSemGestor) return semGestorVisiveis
    if (!selecionado) return []
    const base = equipeInteira ? equipeCompleta(selecionado.id, hierarquia) : hierarquia.diretos.get(selecionado.id) ?? []
    return base.filter(naRegional).filter((p) => coincide(p, termo))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selecionado, mostrandoSemGestor, semGestorVisiveis, equipeInteira, hierarquia, regional, termo])

  const cadeia = selecionado ? cadeiaDeGestores(selecionado.id, hierarquia) : []
  const equipeExibida = verTodos ? equipe : equipe.slice(0, LIMITE_INICIAL)

  const totalUnidades = useMemo(() => new Set(colaboradores.filter((c) => c.unidade).map((c) => c.unidade)).size, [colaboradores])

  useSubtitulo(
    organograma
      ? `${numero(colaboradores.filter((c) => c.naPlanilha).length)} colaboradores · ${numero(hierarquia.gestores.length)} gestores · planilha importada em ${dataHora(organograma.importadoEm)}`
      : 'Importe a planilha do organograma para ver quem reporta a quem',
  )

  function selecionar(id: string | null) {
    setVerTodos(false)
    setEquipeInteira(false)
    setParametros(id ? { gestor: id } : {}, { replace: true })
  }

  async function importarArquivo(arquivo: File | undefined) {
    if (!arquivo) return
    setImportando(true)
    try {
      const texto = await arquivo.text()
      const { colaboradores: lidos, ignoradas } = importarCsvOrganograma(texto)
      definirOrganograma({ arquivo: arquivo.name, importadoEm: new Date().toISOString(), colaboradores: lidos })
      selecionar(null)
      const naPlanilha = lidos.filter((c) => c.naPlanilha).length
      toast(`${numero(naPlanilha)} colaboradores importados${ignoradas ? ` (${ignoradas} linhas sem nome ignoradas)` : ''}`)
    } catch (e: any) {
      toast(e && e.message ? e.message : 'Não foi possível ler a planilha.')
    } finally {
      setImportando(false)
      if (entradaArquivo.current) entradaArquivo.current.value = ''
    }
  }

  function aoSoltar(evento: DragEvent<HTMLElement>) {
    evento.preventDefault()
    setArrastando(false)
    void importarArquivo(evento.dataTransfer.files?.[0])
  }

  function aoEscolher(evento: ChangeEvent<HTMLInputElement>) {
    void importarArquivo(evento.target.files?.[0] ?? undefined)
  }

  function limpar() {
    if (!window.confirm('Remover o organograma deste navegador? Você pode importar a planilha de novo depois.')) return
    limparOrganograma()
    selecionar(null)
    toast('Organograma removido deste navegador')
  }

  function exportar() {
    const titulo = mostrandoSemGestor ? 'sem-gestor' : selecionado ? selecionado.id.replace(/[^a-z0-9]+/gi, '-') : 'equipe'
    const linhas: (string | number)[][] = [['Nome', 'Cargo', 'Setor', 'Unidade', 'Regional', 'E-mail', 'Gestor imediato']]
    for (const pessoa of equipe) {
      const gestor = pessoa.gestorId ? hierarquia.porId.get(pessoa.gestorId) : null
      linhas.push([exibirNome(pessoa), pessoa.cargo, pessoa.setor, pessoa.unidade, pessoa.regional, pessoa.email, gestor ? exibirNome(gestor) : ''])
    }
    baixar({ nome: `organograma-${titulo}.csv`, conteudo: blobCsv(linhas) })
  }

  const entrada = (
    <input ref={entradaArquivo} type="file" accept=".csv,text/csv,text/plain" hidden onChange={aoEscolher} />
  )

  if (!organograma) {
    return (
      <>
        {entrada}
        <section
          className={`card ${estilos.vazio} ${arrastando ? estilos.arrastando : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setArrastando(true)
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={aoSoltar}
        >
          <div className={estilos.vazioIcone}>
            <IconeOrganograma />
          </div>
          <h2>Importe a planilha do organograma</h2>
          <p>
            Exporte a planilha <b>Organograma Empresarial</b> em CSV e solte o arquivo aqui. A tela monta a hierarquia pela coluna{' '}
            <span className="mono">gestor_imediato</span>: clique num gestor para ver quem responde a ele.
          </p>
          <button className="btn btn-primary" onClick={() => entradaArquivo.current?.click()} disabled={importando}>
            {importando ? 'Lendo a planilha…' : 'Escolher arquivo CSV'}
          </button>
          <small>
            Os dados ficam só neste navegador, nada é enviado para servidor. Só entram nome, cargo, e-mail, gestor, setor, unidade e
            regional — CPF e as outras colunas são descartados na importação.
          </small>
        </section>
      </>
    )
  }

  return (
    <>
      {entrada}
      <div className={estilos.toolbar} onDragOver={(e) => e.preventDefault()} onDrop={aoSoltar}>
        <div className={estilos.search}>
          <IconeBusca />
          <input
            placeholder="Buscar gestor ou colaborador…"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value)
              setVerTodos(false)
            }}
            aria-label="Buscar gestor ou colaborador"
          />
        </div>
        {regionais.length > 1 ? (
          <div className={estilos.chips} role="group" aria-label="Regional">
            <button className={`${estilos.chip} ${regional === TODAS ? estilos.on : ''}`} onClick={() => setRegional(TODAS)}>
              Todas
            </button>
            {regionais.map((r) => (
              <button key={r} className={`${estilos.chip} ${regional === r ? estilos.on : ''}`} onClick={() => setRegional(r)}>
                {r}
              </button>
            ))}
          </div>
        ) : null}
        <div className={estilos.acoes}>
          <button className="btn" onClick={() => entradaArquivo.current?.click()} disabled={importando} title={organograma.arquivo}>
            {importando ? 'Lendo…' : 'Importar de novo'}
          </button>
          <button className="btn btn-ghost" onClick={limpar}>
            Remover
          </button>
        </div>
      </div>

      <div className={estilos.grade}>
        <aside className={estilos.listaCard}>
          <div className={estilos.listaCabecalho}>
            <h3>Gestores</h3>
            <span className="muted">{numero(gestoresVisiveis.length)}</span>
          </div>
          <div className={estilos.lista}>
            {gestoresVisiveis.map(({ gestor, diretos, naEquipe }) => {
              const ativo = selecionado?.id === gestor.id
              const indiretos = (hierarquia.equipeTotal.get(gestor.id) ?? diretos) - diretos
              return (
                <button
                  key={gestor.id}
                  className={`${estilos.gestor} ${ativo ? estilos.ativo : ''}`}
                  onClick={() => selecionar(gestor.id)}
                  aria-pressed={ativo}
                >
                  <span className={estilos.av}>{iniciais(gestor.nome) || '··'}</span>
                  <span className={estilos.gestorTexto}>
                    <b>{exibirNome(gestor)}</b>
                    <span>{gestor.cargo || (gestor.naPlanilha ? 'Sem cargo informado' : 'Não consta como colaborador na planilha')}</span>
                  </span>
                  <span className={estilos.contagem}>
                    <b>{numero(diretos)}</b>
                    <span>{termo && naEquipe ? `${naEquipe} na busca` : indiretos > 0 ? `+${numero(indiretos)} indiretos` : 'diretos'}</span>
                  </span>
                </button>
              )
            })}
            {semGestorVisiveis.length ? (
              <button
                className={`${estilos.gestor} ${estilos.semGestor} ${mostrandoSemGestor ? estilos.ativo : ''}`}
                onClick={() => selecionar(SEM_GESTOR)}
                aria-pressed={mostrandoSemGestor}
              >
                <span className={estilos.av}>?</span>
                <span className={estilos.gestorTexto}>
                  <b>Sem gestor informado</b>
                  <span>Linhas da planilha com gestor_imediato vazio</span>
                </span>
                <span className={estilos.contagem}>
                  <b>{numero(semGestorVisiveis.length)}</b>
                </span>
              </button>
            ) : null}
            {!gestoresVisiveis.length && !semGestorVisiveis.length ? (
              <div className={estilos.nada}>Nenhum gestor bate com essa busca.</div>
            ) : null}
          </div>
        </aside>

        <section className={estilos.equipeCard}>
          {!selecionado && !mostrandoSemGestor ? (
            <div className={estilos.resumo}>
              <div className="grid g3">
                <div className="card kpi">
                  <div className="label">Colaboradores</div>
                  <div className="v">{numero(colaboradores.filter((c) => c.naPlanilha).length)}</div>
                  <div className="d">na planilha {organograma.arquivo ? `"${organograma.arquivo}"` : ''}</div>
                </div>
                <div className="card kpi">
                  <div className="label">Gestores</div>
                  <div className="v">{numero(hierarquia.gestores.length)}</div>
                  <div className="d">{numero(hierarquia.gestores.filter((g) => !g.naPlanilha).length)} sem linha própria na planilha</div>
                </div>
                <div className="card kpi">
                  <div className="label">Unidades</div>
                  <div className="v">{numero(totalUnidades)}</div>
                  <div className="d">em {numero(regionais.length)} regionais</div>
                </div>
              </div>
              <p className="muted">
                Escolha um gestor na lista ao lado para ver a equipe dele. Gestores que também respondem a alguém aparecem com o
                caminho até o topo; clique num subordinado que é gestor para descer mais um nível.
              </p>
            </div>
          ) : (
            <>
              <header className={estilos.equipeCabecalho}>
                {selecionado ? (
                  <>
                    <div className={`${estilos.av} ${estilos.avGrande}`}>{iniciais(selecionado.nome) || '··'}</div>
                    <div className={estilos.titulo}>
                      <h2>{exibirNome(selecionado)}</h2>
                      <div className={estilos.detalhes}>
                        {selecionado.cargo ? <span>{selecionado.cargo}</span> : null}
                        {selecionado.setor ? <span>{selecionado.setor}</span> : null}
                        {selecionado.unidade ? <span>{descreverUnidade(selecionado.unidade)}</span> : null}
                        {selecionado.regional ? <span>{selecionado.regional}</span> : null}
                        {!selecionado.naPlanilha ? <span className="badge b-warn">Não consta como colaborador na planilha</span> : null}
                        {selecionado.gestorOperacional ? <span className="badge b-neutral">Gestor operacional</span> : null}
                      </div>
                      {selecionado.email ? <div className={`mono ${estilos.email}`}>{selecionado.email}</div> : null}
                      {cadeia.length ? (
                        <div className={estilos.cadeia}>
                          <span className="muted">Reporta a</span>
                          {cadeia.map((chefe, posicao) => (
                            <span key={chefe.id}>
                              {posicao > 0 ? <span className={estilos.seta}>›</span> : null}
                              <button className={estilos.link} onClick={() => selecionar(chefe.id)}>
                                {exibirNome(chefe)}
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className={estilos.titulo}>
                    <h2>Sem gestor informado</h2>
                    <div className={estilos.detalhes}>
                      <span>Colaboradores cuja linha na planilha está com o gestor imediato vazio</span>
                    </div>
                  </div>
                )}
                <div className={estilos.equipeAcoes}>
                  {selecionado ? (
                    <div className={estilos.seg} role="group" aria-label="Diretos ou equipe inteira">
                      <button className={!equipeInteira ? estilos.on : ''} onClick={() => setEquipeInteira(false)}>
                        Diretos · {numero((hierarquia.diretos.get(selecionado.id) ?? []).length)}
                      </button>
                      <button className={equipeInteira ? estilos.on : ''} onClick={() => setEquipeInteira(true)}>
                        Equipe inteira · {numero(hierarquia.equipeTotal.get(selecionado.id) ?? 0)}
                      </button>
                    </div>
                  ) : null}
                  <button className="btn" onClick={exportar} disabled={!equipe.length}>
                    <IconeExportar />
                    Exportar CSV
                  </button>
                </div>
              </header>

              <div className={estilos.rolagem}>
                <table>
                  <thead>
                    <tr>
                      <th>Colaborador</th>
                      <th>Cargo</th>
                      <th>Setor</th>
                      <th>Unidade</th>
                      {equipeInteira || mostrandoSemGestor ? <th>{mostrandoSemGestor ? 'Regional' : 'Gestor imediato'}</th> : null}
                      <th className={estilos.colEquipe}>Equipe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipeExibida.map((pessoa) => {
                      const subordinados = (hierarquia.diretos.get(pessoa.id) ?? []).length
                      const gestorDela = pessoa.gestorId ? hierarquia.porId.get(pessoa.gestorId) : null
                      return (
                        <tr
                          key={pessoa.id}
                          className={subordinados ? estilos.linhaGestor : ''}
                          onClick={subordinados ? () => selecionar(pessoa.id) : undefined}
                          title={subordinados ? `Ver a equipe de ${exibirNome(pessoa)}` : undefined}
                        >
                          <td>
                            <div className="person">
                              <div className="av">{iniciais(pessoa.nome) || '··'}</div>
                              <div>
                                <b>{exibirNome(pessoa)}</b>
                                <span>{pessoa.email || '—'}</span>
                              </div>
                            </div>
                          </td>
                          <td>{pessoa.cargo || <span className="muted">—</span>}</td>
                          <td>{pessoa.setor || <span className="muted">—</span>}</td>
                          <td>
                            {pessoa.unidade ? (
                              <>
                                {descreverUnidade(pessoa.unidade)}
                                {pessoa.regional && !mostrandoSemGestor ? <span className={estilos.regional}> · {pessoa.regional}</span> : null}
                              </>
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                          {mostrandoSemGestor ? (
                            <td>{pessoa.regional || <span className="muted">—</span>}</td>
                          ) : equipeInteira ? (
                            <td>{gestorDela ? exibirNome(gestorDela) : <span className="muted">—</span>}</td>
                          ) : null}
                          <td className={estilos.colEquipe}>
                            {subordinados ? (
                              <span className="badge b-ok">Gestor · {numero(hierarquia.equipeTotal.get(pessoa.id) ?? subordinados)}</span>
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {!equipe.length ? (
                      <tr>
                        <td colSpan={6} className={estilos.nada}>
                          Ninguém nesta seleção{termo || regional !== TODAS ? ' — tente limpar a busca ou a regional' : ''}.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              {equipe.length > equipeExibida.length ? (
                <div className={estilos.rodape}>
                  <button className="btn" onClick={() => setVerTodos(true)}>
                    Mostrar todos os {numero(equipe.length)}
                  </button>
                </div>
              ) : equipe.length > LIMITE_INICIAL ? (
                <div className={estilos.rodape}>
                  <button className="btn btn-ghost" onClick={() => setVerTodos(false)}>
                    Mostrar só os primeiros {LIMITE_INICIAL}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </>
  )
}
