import { useState } from 'react'
import { Carregando, Erro } from '../../components/Estado'
import { IconeBusca } from '../../components/icones'
import { useToast } from '../../components/Toast'
import { contasRepo, relatoriosRepo, type FiltroContas, type StatusConta } from '../../data'
import { useSubtitulo } from '../../layout/pagina'
import { baixar } from '../../lib/baixar'
import { useDados } from '../../lib/dados'
import { BADGE, iniciais, money, quando } from '../../lib/formato'
import { useConsulta } from '../../lib/useConsulta'
import { useDebounce } from '../../lib/useDebounce'
import { DetalheConta } from './DetalheConta'
import estilos from './Usuarios.module.css'

const STATUS: Array<[StatusConta | 'todos', string]> = [
  ['todos', 'Todos'],
  ['ativo', 'Ativos'],
  ['ocioso', 'Ociosos'],
  ['inativo', 'Inativos'],
  ['nunca', 'Nunca acessaram'],
]

const FILTRO_INICIAL: FiltroContas = { q: '', depto: 'todos', status: 'todos', sort: 'dias', dir: -1 }

export function Usuarios() {
  const { versao, invalidar } = useDados()
  const toast = useToast()
  const [filtro, setFiltro] = useState<FiltroContas>(FILTRO_INICIAL)
  const [contaAberta, setContaAberta] = useState<string | null>(null)
  const busca = useDebounce(filtro.q)

  const { dados, carregando, erro, recarregar } = useConsulta(
    () => contasRepo.listar({ ...filtro, q: busca }),
    [busca, filtro.depto, filtro.status, filtro.sort, filtro.dir, versao],
  )

  useSubtitulo(
    dados
      ? `${dados.total} contas · ${dados.contas.filter((c) => c.status !== 'ativo').length} precisam de revisão nesta seleção`
      : 'Carregando…',
  )

  /** Clicar na mesma coluna inverte a ordem; em outra, começa pelo padrão dela. */
  function ordenarPor(coluna: FiltroContas['sort']) {
    setFiltro((atual) => ({
      ...atual,
      sort: coluna,
      dir: atual.sort === coluna ? ((atual.dir * -1) as 1 | -1) : coluna === 'nome' ? 1 : -1,
    }))
  }

  async function exportarSelecao() {
    if (!dados) return
    try {
      const arquivo = await relatoriosRepo.exportarSelecao(dados.contas.map((c) => c.upn))
      baixar(arquivo)
      invalidar()
      toast(`Seleção exportada: ${arquivo.nome}`)
    } catch (falha) {
      toast((falha as Error).message)
    }
  }

  const seta = (coluna: FiltroContas['sort']) =>
    filtro.sort === coluna ? (filtro.dir < 0 ? ' ↓' : ' ↑') : ''

  if (erro) return <Erro mensagem={erro} aoTentarNovamente={recarregar} />

  return (
    <>
      <div className={estilos.toolbar}>
        <div className={estilos.search}>
          <IconeBusca />
          <input
            placeholder="Buscar por nome, e-mail ou cargo"
            value={filtro.q}
            onChange={(e) => setFiltro({ ...filtro, q: e.target.value })}
          />
        </div>

        <select
          className="sel"
          value={filtro.depto}
          onChange={(e) => setFiltro({ ...filtro, depto: e.target.value })}
        >
          <option value="todos">Todos os setores</option>
          {(dados?.deptos ?? []).map((depto) => (
            <option key={depto} value={depto}>
              {depto}
            </option>
          ))}
        </select>

        <div className={estilos.chips}>
          {STATUS.map(([chave, rotulo]) => (
            <button
              key={chave}
              className={`${estilos.chip} ${filtro.status === chave ? estilos.on : ''}`}
              onClick={() => setFiltro({ ...filtro, status: chave })}
            >
              {rotulo}
            </button>
          ))}
        </div>
      </div>

      {carregando && !dados ? (
        <Carregando />
      ) : (
        dados && (
          <div className={estilos.tableCard}>
            <table>
              <thead>
                <tr>
                  <th className="s" onClick={() => ordenarPor('nome')}>
                    Usuário{seta('nome')}
                  </th>
                  <th>Setor</th>
                  <th>Licença</th>
                  <th className="s" onClick={() => ordenarPor('dias')}>
                    Último acesso{seta('dias')}
                  </th>
                  <th>MFA</th>
                  <th className="s" onClick={() => ordenarPor('gb')}>
                    OneDrive{seta('gb')}
                  </th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {dados.contas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className={estilos.vazio}>
                      <b>Nenhuma conta com esses filtros</b>
                      <span className="muted" style={{ fontSize: 13 }}>
                        Limpe a busca ou escolha outro setor.
                      </span>
                    </td>
                  </tr>
                ) : (
                  dados.contas.map((conta) => (
                    <tr key={conta.upn} onClick={() => setContaAberta(conta.upn)}>
                      <td>
                        <div className="person">
                          <div className="av">{iniciais(conta.nome)}</div>
                          <div>
                            <b>{conta.nome}</b>
                            <span>{conta.upn}</span>
                          </div>
                        </div>
                      </td>
                      <td className="muted">{conta.depto}</td>
                      <td>
                        <span className="badge b-neutral">
                          <i
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: 2,
                              background: conta.sku.cor,
                              display: 'inline-block',
                            }}
                          />
                          {conta.sku.curto}
                        </span>
                      </td>
                      <td
                        className="mono"
                        style={{ color: conta.status === 'ativo' ? 'var(--text-2)' : 'var(--text)' }}
                      >
                        {quando(conta.diasUltimoAcesso)}
                      </td>
                      <td>
                        {conta.ehRecurso ? (
                          <span className="muted">—</span>
                        ) : conta.mfa ? (
                          <span className="badge b-ok">Ativo</span>
                        ) : (
                          <span className="badge b-bad">Sem MFA</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div className="bar" style={{ width: 56, minWidth: 56 }}>
                            <i
                              style={{
                                width: `${Math.min(100, (conta.oneDriveGb / 45) * 100)}%`,
                                background: conta.oneDriveGb > 25 ? 'var(--amber)' : 'var(--accent)',
                              }}
                            />
                          </div>
                          <span className="mono" style={{ fontSize: 12, color: 'var(--text-2)' }}>
                            {conta.oneDriveGb.toFixed(1)} GB
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${BADGE[conta.status].classe}`}>
                          {BADGE[conta.status].rotulo}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className={estilos.footNote}>
              <span>
                {dados.contas.length} de {dados.total} contas
              </span>
              {dados.custoSelecao > 0 && (
                <span style={{ color: 'var(--amber)' }}>
                  · {money(dados.custoSelecao)}/mês em licenças sem uso nesta seleção
                </span>
              )}
              <button
                className="act"
                style={{ marginLeft: 'auto', color: 'var(--accent)' }}
                onClick={exportarSelecao}
                disabled={dados.contas.length === 0}
              >
                Exportar seleção
              </button>
            </div>
          </div>
        )
      )}

      <DetalheConta upn={contaAberta} aoFechar={() => setContaAberta(null)} />
    </>
  )
}
