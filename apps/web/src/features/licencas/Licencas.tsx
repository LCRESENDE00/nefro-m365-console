import { useNavigate } from 'react-router-dom'
import { Carregando, Erro } from '../../components/Estado'
import { licencasRepo, type Plano } from '../../data'
import { useSubtitulo } from '../../layout/pagina'
import { useDados } from '../../lib/dados'
import { money, money0 } from '../../lib/formato'
import { useConsulta } from '../../lib/useConsulta'
import estilos from './Licencas.module.css'

export function Licencas() {
  const { versao } = useDados()
  const navegar = useNavigate()
  const { dados, carregando, erro, recarregar } = useConsulta(() => licencasRepo.resumo(), [versao])

  useSubtitulo(
    dados
      ? `${dados.planos.length} planos · ${dados.planos.reduce((s, p) => s + p.comprados, 0)} assentos contratados`
      : 'Carregando…',
  )

  if (erro) return <Erro mensagem={erro} aoTentarNovamente={recarregar} />
  if (carregando || !dados) return <Carregando />

  return (
    <>
      <div className="grid g3" style={{ marginBottom: 16 }}>
        <div className="card kpi">
          <div className="label">Custo mensal atribuído</div>
          <div className="v">{money(dados.custoAtribuido)}</div>
          <div className="d">{dados.totalContas} licenças em contas</div>
        </div>
        <div className="card kpi">
          <div className="label">Assentos livres</div>
          <div className="v">{dados.assentosLivres}</div>
          <div className="d">contratados e nunca atribuídos</div>
        </div>
        <div className="card kpi">
          <div className="label">Economia possível</div>
          <div className="v" style={{ color: 'var(--teal)' }}>
            {money(dados.economiaPossivel)}
          </div>
          <div className="d">removendo licenças sem uso</div>
        </div>
      </div>

      <div className="grid g2">
        {dados.planos.map((plano) => (
          <CartaoPlano key={plano.codigo} plano={plano} aoVerContas={() => navegar('/usuarios')} />
        ))}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-h">
          <h3>Como o gasto se distribui</h3>
        </div>
        <div className="stack" style={{ height: 16, marginTop: 6 }}>
          {dados.planos.map((plano) => (
            <span
              key={plano.codigo}
              style={{
                width: `${((plano.custoMensal / dados.custoContratado) * 100).toFixed(1)}%`,
                background: plano.cor,
              }}
            />
          ))}
        </div>
        <div className="legend" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {dados.planos.map((plano) => (
            <div className="li" key={plano.codigo}>
              <span className="sw" style={{ background: plano.cor }} />
              {plano.curto}
              <span className="val">{money0(plano.custoMensal)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function CartaoPlano({ plano, aoVerContas }: { plano: Plano; aoVerContas: () => void }) {
  const pct = (valor: number) => `${((valor / plano.comprados) * 100).toFixed(1)}%`
  const desperdicados = plano.semAcesso + plano.livres

  return (
    <div className={estilos.lic}>
      <div className={estilos.top}>
        <div>
          <h4>{plano.nome}</h4>
          <span className="muted" style={{ fontSize: 12.3 }}>
            {money(plano.preco)} por assento/mês
          </span>
        </div>
        <div className={estilos.price}>
          <b>{money(plano.custoMensal)}</b>
          <div className="muted" style={{ fontSize: 11.5 }}>
            {plano.comprados} assentos
          </div>
        </div>
      </div>

      <div className={estilos.seats}>
        <span style={{ width: pct(plano.emUso), background: plano.cor }} />
        <span style={{ width: pct(plano.semAcesso), background: 'var(--amber)', opacity: 0.75 }} />
        <span style={{ width: pct(plano.livres), background: 'var(--surface-3)' }} />
      </div>

      <div className={estilos.legenda}>
        <span>
          <i style={{ background: plano.cor }} />
          {plano.emUso} em uso
        </span>
        <span>
          <i style={{ background: 'var(--amber)' }} />
          {plano.semAcesso} sem acesso
        </span>
        <span>
          <i style={{ background: 'var(--surface-3)' }} />
          {plano.livres} livres
        </span>
      </div>

      {desperdicados > 0 && (
        <div className={estilos.why}>
          {plano.semAcesso > 0 &&
            `${plano.semAcesso} licença${plano.semAcesso > 1 ? 's' : ''} atribuída${plano.semAcesso > 1 ? 's' : ''} a contas sem acesso recente`}
          {plano.semAcesso > 0 && plano.livres > 0 && ' e '}
          {plano.livres > 0 &&
            `${plano.livres} assento${plano.livres > 1 ? 's' : ''} pago${plano.livres > 1 ? 's' : ''} sem ninguém`}
          {' → '}
          {money(plano.custoDesperdicado)}/mês.
        </div>
      )}

      <button className="btn" style={{ alignSelf: 'flex-start' }} onClick={aoVerContas}>
        Ver contas deste plano
      </button>
    </div>
  )
}
