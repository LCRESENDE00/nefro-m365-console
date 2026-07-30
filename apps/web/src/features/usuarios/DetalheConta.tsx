import { AreaChart } from '../../components/AreaChart'
import { Drawer } from '../../components/Drawer'
import { useToast } from '../../components/Toast'
import { contasRepo } from '../../data'
import { useDados } from '../../lib/dados'
import { BADGE, iniciais, money, money0, numero, quando } from '../../lib/formato'
import { useConsulta } from '../../lib/useConsulta'
import estilos from './Usuarios.module.css'

type Props = { upn: string | null; aoFechar: () => void }

/** Painel lateral com o detalhe da conta e a economia possivel ao liberar a licenca. */
export function DetalheConta({ upn, aoFechar }: Props) {
  const toast = useToast()
  const { versao } = useDados()
  const { dados: conta, erro } = useConsulta(
    () => (upn ? contasRepo.buscarPorUpn(upn) : Promise.resolve(null)),
    [upn, versao],
  )

  async function marcarParaRevisao() {
    if (!conta) return
    const { marcada } = await contasRepo.alternarRevisao(conta.upn)
    toast(marcada ? 'Conta marcada para revisão' : 'Marcação removida')
  }

  async function copiarDados() {
    if (!conta) return
    const linha = [conta.nome, conta.upn, conta.depto, conta.sku.curto, quando(conta.diasUltimoAcesso)].join('\t')
    await navigator.clipboard.writeText(linha)
    toast('Linha copiada')
  }

  return (
    <Drawer aberto={Boolean(upn)} aoFechar={aoFechar}>
      {erro && <p className="muted">{erro}</p>}
      {conta && (
        <>
          <div className="person" style={{ gap: 14, marginBottom: 20 }}>
            <div
              className="av"
              style={{ width: 46, height: 46, borderRadius: 13, fontSize: 15 }}
            >
              {iniciais(conta.nome)}
            </div>
            <div>
              <b style={{ fontSize: 16, fontFamily: 'var(--display)' }}>{conta.nome}</b>
              <span style={{ fontSize: 12 }}>{conta.upn}</span>
            </div>
          </div>

          <span className={`badge ${BADGE[conta.status].classe}`}>{BADGE[conta.status].rotulo}</span>
          {!conta.ehRecurso && !conta.mfa && (
            <span className="badge b-bad" style={{ marginLeft: 6 }}>
              Sem MFA
            </span>
          )}

          <div style={{ marginTop: 18 }}>
            <div className="dl">
              <span>Cargo</span>
              <b>{conta.cargo}</b>
            </div>
            <div className="dl">
              <span>Setor</span>
              <b>{conta.depto}</b>
            </div>
            <div className="dl">
              <span>Licença</span>
              <b>{conta.sku.nome}</b>
            </div>
            <div className="dl">
              <span>Custo mensal</span>
              <b className="mono">{money(conta.sku.preco)}</b>
            </div>
            <div className="dl">
              <span>Último acesso</span>
              <b>{quando(conta.diasUltimoAcesso)}</b>
            </div>
            <div className="dl">
              <span>OneDrive</span>
              <b className="mono">
                {conta.oneDriveGb.toFixed(1)} GB · {numero(conta.arquivos)} arquivos
              </b>
            </div>
            <div className="dl">
              <span>MFA</span>
              <b>{conta.ehRecurso ? 'não se aplica' : conta.mfa ? 'configurado' : 'não configurado'}</b>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <div
              className="muted"
              style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}
            >
              Acessos por semana ({conta.serieAcessos.length} semanas)
            </div>
            <AreaChart
              dados={conta.serieAcessos}
              cor={conta.status === 'ativo' ? '#3FBFA8' : '#F2657A'}
              altura={90}
            />
          </div>

          {conta.status !== 'ativo' && (
            <div className={estilos.rec}>
              <b>Sugestão</b>
              Remover a licença {conta.sku.curto} desta conta economiza {money(conta.sku.preco)} por
              mês ({money0(conta.sku.preco * 12)} ao ano). O e-mail pode virar uma caixa
              compartilhada sem custo.
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
            <button className="btn" onClick={marcarParaRevisao}>
              Marcar para revisão
            </button>
            <button className="btn btn-ghost" onClick={copiarDados}>
              Copiar dados
            </button>
          </div>

          <p className="muted" style={{ fontSize: 11.5, marginTop: 18 }}>
            As alterações de licença continuam sendo feitas no Admin Center. Este app é somente
            leitura no tenant.
          </p>
        </>
      )}
    </Drawer>
  )
}
