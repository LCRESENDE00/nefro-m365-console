import { CLASSIFICACOES, REGIMES, TIPOS_LICENCA, dataBr, rotuloTipoContrato } from '@nefro/dominio'
import { useState } from 'react'
import { Carregando, Erro } from '../../components/Estado'
import {
  IconeBusca,
  IconeChave,
  IconeEditar,
  IconeInativar,
  IconeNovaConta,
} from '../../components/icones'
import { useToast } from '../../components/Toast'
import { contasRepo, relatoriosRepo, type Conta, type FiltroContas, type StatusConta } from '../../data'
import { useSubtitulo } from '../../layout/pagina'
import { baixar } from '../../lib/baixar'
import { useDados } from '../../lib/dados'
import { BADGE, iniciais, money, quando } from '../../lib/formato'
import { useConsulta } from '../../lib/useConsulta'
import { useDebounce } from '../../lib/useDebounce'
import { DetalheConta } from './DetalheConta'
import { FormularioConta } from './FormularioConta'
import estilos from './Usuarios.module.css'

const STATUS: Array<[StatusConta | 'todos', string]> = [
  ['todos', 'Todos'],
  ['ativo', 'Ativos'],
  ['ocioso', 'Ociosos'],
  ['inativo', 'Inativos'],
  ['nunca', 'Nunca acessaram'],
]

const FILTRO_INICIAL: FiltroContas = {
  q: '',
  depto: 'todos',
  unidade: 'todos',
  tipoLicenca: 'todos',
  classificacao: 'todos',
  regime: 'todos',
  produto: 'todos',
  status: 'todos',
  sort: 'dias',
  dir: -1,
}

/** `null` = formulário fechado; `{conta: null}` = cadastro novo. */
type Formulario = { conta: Conta | null } | null

const mesmoTexto = (valores: string[]): Array<[string, string]> => valores.map((v) => [v, v])

/** Um seletor de filtro: a primeira opção é sempre "todos". */
function Seletor({
  valor,
  rotuloTodos,
  opcoes,
  aoMudar,
}: {
  valor: string
  rotuloTodos: string
  opcoes: Array<[string, string]>
  aoMudar: (valor: string) => void
}) {
  return (
    <select
      className="sel"
      aria-label={rotuloTodos}
      value={valor}
      onChange={(e) => aoMudar(e.target.value)}
    >
      <option value="todos">{rotuloTodos}</option>
      {opcoes.map(([chave, texto]) => (
        <option key={chave} value={chave}>
          {texto}
        </option>
      ))}
    </select>
  )
}

export function Usuarios() {
  const { versao, invalidar } = useDados()
  const toast = useToast()
  const [filtro, setFiltro] = useState<FiltroContas>(FILTRO_INICIAL)
  const [contaAberta, setContaAberta] = useState<string | null>(null)
  const [formulario, setFormulario] = useState<Formulario>(null)
  const [senhaGerada, setSenhaGerada] = useState<{ nome: string; senha: string } | null>(null)
  const busca = useDebounce(filtro.q)

  const { dados, carregando, erro, recarregar } = useConsulta(
    () => contasRepo.listar({ ...filtro, q: busca }),
    [
      busca,
      filtro.depto,
      filtro.unidade,
      filtro.tipoLicenca,
      filtro.classificacao,
      filtro.regime,
      filtro.produto,
      filtro.status,
      filtro.sort,
      filtro.dir,
      versao,
    ],
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

  async function redefinirSenha(conta: Conta) {
    try {
      const { senha } = await contasRepo.redefinirSenha(conta.upn)
      setSenhaGerada({ nome: conta.nome, senha })
      invalidar()
    } catch (falha) {
      toast((falha as Error).message)
    }
  }

  async function alternarSituacao(conta: Conta) {
    const acao = conta.habilitada ? 'Inativar' : 'Reativar'
    if (!window.confirm(`${acao} a conta de ${conta.nome}?`)) return
    try {
      const { habilitada } = await contasRepo.alternarSituacao(conta.upn)
      invalidar()
      toast(habilitada ? `Conta de ${conta.nome} reativada` : `Conta de ${conta.nome} inativada`)
    } catch (falha) {
      toast((falha as Error).message)
    }
  }

  const seta = (coluna: FiltroContas['sort']) =>
    filtro.sort === coluna ? (filtro.dir < 0 ? ' ↓' : ' ↑') : ''

  const aoFiltrar = (campo: keyof FiltroContas) => (valor: string) =>
    setFiltro((atual) => ({ ...atual, [campo]: valor }))

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

        <Seletor
          valor={filtro.unidade}
          rotuloTodos="Todas as unidades"
          opcoes={mesmoTexto(dados?.unidades ?? [])}
          aoMudar={aoFiltrar('unidade')}
        />
        <Seletor
          valor={filtro.depto}
          rotuloTodos="Todos os setores"
          opcoes={mesmoTexto(dados?.deptos ?? [])}
          aoMudar={aoFiltrar('depto')}
        />
        <Seletor
          valor={filtro.tipoLicenca}
          rotuloTodos="Todos os tipos de licença"
          opcoes={TIPOS_LICENCA}
          aoMudar={aoFiltrar('tipoLicenca')}
        />
        <Seletor
          valor={filtro.classificacao}
          rotuloTodos="Toda classificação"
          opcoes={CLASSIFICACOES}
          aoMudar={aoFiltrar('classificacao')}
        />
        <Seletor
          valor={filtro.regime}
          rotuloTodos="Todo regime"
          opcoes={REGIMES}
          aoMudar={aoFiltrar('regime')}
        />
        <Seletor
          valor={filtro.produto}
          rotuloTodos="Todos os produtos"
          opcoes={mesmoTexto(dados?.produtos ?? [])}
          aoMudar={aoFiltrar('produto')}
        />

        <button className="btn btn-primary" onClick={() => setFormulario({ conta: null })}>
          <IconeNovaConta />
          Nova conta
        </button>
      </div>

      <div className={estilos.toolbar}>
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

      {senhaGerada && (
        <div className={estilos.senha}>
          <div>
            <b>Senha temporária de {senhaGerada.nome}</b>
            <span className="mono">{senhaGerada.senha}</span>
          </div>
          <button
            className="btn"
            onClick={() => {
              void navigator.clipboard.writeText(senhaGerada.senha)
              toast('Senha copiada')
            }}
          >
            Copiar
          </button>
          <button className="btn btn-ghost" onClick={() => setSenhaGerada(null)}>
            Fechar
          </button>
        </div>
      )}

      {carregando && !dados ? (
        <Carregando />
      ) : (
        dados && (
          <div className={estilos.tableCard}>
            <div className={estilos.rolagem}>
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
                    <th>Contrato</th>
                    <th className="s" onClick={() => ordenarPor('renovacao')}>
                      Renovação{seta('renovacao')}
                    </th>
                    <th className="s" onClick={() => ordenarPor('valor')}>
                      Valor total{seta('valor')}
                    </th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.contas.length === 0 ? (
                    <tr>
                      <td colSpan={11} className={estilos.vazio}>
                        <b>Nenhuma conta com esses filtros</b>
                        <span className="muted" style={{ fontSize: 13 }}>
                          Limpe a busca ou escolha outra combinação de filtros.
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
                        <td className="muted">{rotuloTipoContrato(conta.tipoContrato)}</td>
                        <td className="mono" style={{ fontSize: 12.5 }}>
                          {dataBr(conta.dataRenovacao)}
                        </td>
                        <td className="mono" style={{ fontSize: 12.5 }}>
                          {money(conta.valorTotal)}
                        </td>
                        <td>
                          <span className={`badge ${BADGE[conta.status].classe}`}>
                            {BADGE[conta.status].rotulo}
                          </span>
                          {!conta.habilitada && (
                            <span className="badge b-neutral" style={{ marginLeft: 6 }}>
                              Inativada
                            </span>
                          )}
                        </td>
                        <td>
                          <div
                            className={estilos.acoes}
                            onClick={(evento) => evento.stopPropagation()}
                          >
                            <button
                              title="Editar cadastro"
                              aria-label={`Editar cadastro de ${conta.nome}`}
                              onClick={() => setFormulario({ conta })}
                            >
                              <IconeEditar />
                            </button>
                            <button
                              title="Redefinir senha"
                              aria-label={`Redefinir senha de ${conta.nome}`}
                              onClick={() => void redefinirSenha(conta)}
                            >
                              <IconeChave />
                            </button>
                            <button
                              className={conta.habilitada ? estilos.perigo : ''}
                              title={conta.habilitada ? 'Inativar usuário' : 'Reativar usuário'}
                              aria-label={`${conta.habilitada ? 'Inativar' : 'Reativar'} ${conta.nome}`}
                              onClick={() => void alternarSituacao(conta)}
                            >
                              <IconeInativar />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

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

      <DetalheConta
        upn={contaAberta}
        aoFechar={() => setContaAberta(null)}
        aoEditar={(conta) => {
          setContaAberta(null)
          setFormulario({ conta })
        }}
      />

      <FormularioConta
        aberto={formulario !== null}
        conta={formulario?.conta ?? null}
        aoFechar={() => setFormulario(null)}
      />
    </>
  )
}
