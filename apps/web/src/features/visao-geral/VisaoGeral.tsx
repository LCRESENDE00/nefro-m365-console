import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AreaChart } from '../../components/AreaChart'
import { BarChart } from '../../components/BarChart'
import { Carregando, Erro } from '../../components/Estado'
import { metricasRepo } from '../../data'
import { useDados } from '../../lib/dados'
import { BADGE, iniciais, money, money0, quando } from '../../lib/formato'
import { useConsulta } from '../../lib/useConsulta'
import { DetalheConta } from '../usuarios/DetalheConta'
import { useSubtitulo } from '../../layout/pagina'
import estilos from './VisaoGeral.module.css'

const MESES = ['mar', 'abr', 'mai', 'jun', 'jul']

export function VisaoGeral() {
  const { versao } = useDados()
  const { dados, carregando, erro, recarregar } = useConsulta(() => metricasRepo.visaoGeral(), [versao])
  const [contaAberta, setContaAberta] = useState<string | null>(null)

  useSubtitulo(
    dados
      ? `Sem acesso há mais de ${dados.limiares.limiarInativo} dias conta como inativa · ${dados.totalContas} contas licenciadas`
      : 'Carregando…',
  )

  if (erro) return <Erro mensagem={erro} aoTentarNovamente={recarregar} />
  if (carregando || !dados) return <Carregando />

  return (
    <>
      <div className="grid g4">
        <div className="card kpi">
          <div className="label">Contas licenciadas</div>
          <div className="v">{dados.totalContas}</div>
          <div className="d">
            {dados.ativos} com acesso nos últimos {dados.limiares.limiarOcioso} dias
          </div>
        </div>
        <div className="card kpi">
          <div className="label">Ociosas</div>
          <div className="v" style={{ color: 'var(--amber)' }}>
            {dados.ociosos}
          </div>
          <div className="d">
            sem acesso entre {dados.limiares.limiarOcioso + 1} e {dados.limiares.limiarInativo} dias
          </div>
        </div>
        <div className="card kpi">
          <div className="label">Inativas</div>
          <div className="v" style={{ color: 'var(--rose)' }}>
            {dados.inativos}
          </div>
          <div className="d">incluindo contas que nunca acessaram</div>
        </div>
        <div className="card kpi">
          <div className="label">Sem MFA</div>
          <div className="v">{dados.semMfa}</div>
          <div className="d">de {dados.totalPessoas} contas de pessoas</div>
        </div>
      </div>

      <div className="grid g2" style={{ marginTop: 16 }}>
        <div className={estilos.waste}>
          <div className="card-h">
            <h3>Custo ocioso</h3>
            <span className="badge b-bad" style={{ marginLeft: 'auto' }}>
              {dados.ociosos + dados.inativos} licenças paradas
            </span>
          </div>
          <div className={estilos.big}>
            {money(dados.desperdicioTotal)}
            <small> /mês</small>
          </div>
          <div className="muted" style={{ fontSize: 12.5 }}>
            {money0(dados.desperdicioTotal * 12)} por ano se nada mudar
          </div>

          <div className="stack">
            {dados.desperdicioPorSku.map((fatia) => (
              <span
                key={fatia.codigo}
                style={{
                  width: `${((fatia.valor / dados.desperdicioTotal) * 100).toFixed(1)}%`,
                  background: fatia.cor,
                }}
              />
            ))}
          </div>

          <div className="legend">
            {dados.desperdicioPorSku.map((fatia) => (
              <div className="li" key={fatia.codigo}>
                <span className="sw" style={{ background: fatia.cor }} />
                {fatia.curto}
                <span className="val">{money(fatia.valor)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <h3>Usuários com acesso semanal</h3>
            <span className="muted" style={{ fontSize: 12, marginLeft: 'auto' }}>
              {dados.serieAcessos.length} semanas
            </span>
          </div>
          <AreaChart dados={dados.serieAcessos} />
          <div className={estilos.eixo}>
            {MESES.map((mes) => (
              <span key={mes}>{mes}</span>
            ))}
          </div>
          <div className={estilos.nota}>
            Queda de {dados.serieAcessos[0] - dados.serieAcessos[dados.serieAcessos.length - 1]}{' '}
            usuários ativos desde o início da série, sem redução de assentos contratados.
          </div>
        </div>
      </div>

      <div className="grid g2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="card-h">
            <h3>Tempo desde o último acesso</h3>
          </div>
          <BarChart
            barras={dados.distribuicaoAcesso.map((f) => ({
              rotulo: f.faixa,
              valor: f.valor,
              cor: f.cor,
            }))}
          />
        </div>

        <div className="card">
          <div className="card-h">
            <h3>Precisam de revisão</h3>
            <BotaoVerTodos />
          </div>
          {dados.precisamRevisao.map((conta) => (
            <div
              key={conta.upn}
              className="srow"
              style={{ cursor: 'pointer' }}
              onClick={() => setContaAberta(conta.upn)}
            >
              <div className="person" style={{ flex: 1, minWidth: 0 }}>
                <div className="av">{iniciais(conta.nome)}</div>
                <div style={{ minWidth: 0 }}>
                  <b>{conta.nome}</b>
                  <span>{conta.cargo}</span>
                </div>
              </div>
              <span className={`badge ${BADGE[conta.status].classe}`}>
                {quando(conta.diasUltimoAcesso)}
              </span>
              <span
                className="mono"
                style={{ fontSize: 12.5, width: 78, textAlign: 'right', color: 'var(--text-2)' }}
              >
                {money(conta.sku.preco)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <DetalheConta upn={contaAberta} aoFechar={() => setContaAberta(null)} />
    </>
  )
}

function BotaoVerTodos() {
  const navegar = useNavigate()
  return (
    <button className="act" onClick={() => navegar('/usuarios')}>
      Ver todos
    </button>
  )
}
