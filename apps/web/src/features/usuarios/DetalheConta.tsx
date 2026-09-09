import {
  dataBr,
  rotuloClassificacao,
  rotuloRegime,
  rotuloTipoContrato,
  rotuloTipoLicenca,
} from '@nefro/dominio'
import { AreaChart } from '../../components/AreaChart'
import { Drawer } from '../../components/Drawer'
import { useToast } from '../../components/Toast'
import { contasRepo, type Conta } from '../../data'
import { useDados } from '../../lib/dados'
import { BADGE, iniciais, money, money0, numero, quando } from '../../lib/formato'
import { useConsulta } from '../../lib/useConsulta'
import estilos from './Usuarios.module.css'

/** `aoEditar` so vem da tela de Usuarios, que e onde o formulario vive. */
type Props = { upn: string | null; aoFechar: () => void; aoEditar?: (conta: Conta) => void }

/** Painel lateral com o detalhe da conta e a economia possivel ao liberar a licenca. */
export function DetalheConta({ upn, aoFechar, aoEditar }: Props) {
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
          {!conta.habilitada && (
            <span className="badge b-neutral" style={{ marginLeft: 6 }}>
              Inativada
            </span>
          )}
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
              <span>Unidade</span>
              <b>{conta.unidade || '—'}</b>
            </div>
            <div className="dl">
              <span>Setor</span>
              <b>{conta.depto}</b>
            </div>
            <div className="dl">
              <span>CNPJ</span>
              <b className="mono" style={{ fontSize: 12 }}>
                {conta.cnpj || '—'}
              </b>
            </div>
            <div className="dl">
              <span>Classificação</span>
              <b>{rotuloClassificacao(conta.classificacao)}</b>
            </div>
            <div className="dl">
              <span>Regime</span>
              <b>{rotuloRegime(conta.regime)}</b>
            </div>
            <div className="dl">
              <span>Licença</span>
              <b>{conta.sku.nome}</b>
            </div>
            <div className="dl">
              <span>Tipo de licença</span>
              <b>{rotuloTipoLicenca(conta.tipoLicenca)}</b>
            </div>
            <div className="dl">
              <span>Produto contratado</span>
              <b>{conta.produto || '—'}</b>
            </div>
            <div className="dl">
              <span>Tipo de contrato</span>
              <b>{rotuloTipoContrato(conta.tipoContrato)}</b>
            </div>
            <div className="dl">
              <span>Data de renovação</span>
              <b className="mono" style={{ fontSize: 12.5 }}>
                {dataBr(conta.dataRenovacao)}
              </b>
            </div>
            <div className="dl">
              <span>Valor total atribuído</span>
              <b className="mono">{money(conta.valorTotal)}</b>
            </div>
            <div className="dl">
              <span>Custo do assento</span>
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

          <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
            {aoEditar && (
              <button className="btn btn-primary" onClick={() => aoEditar(conta)}>
                Editar cadastro
              </button>
            )}
            <button className="btn" onClick={marcarParaRevisao}>
              Marcar para revisão
            </button>
            <button className="btn btn-ghost" onClick={copiarDados}>
              Copiar dados
            </button>
          </div>

          <p className="muted" style={{ fontSize: 11.5, marginTop: 18 }}>
            Editar cadastro, redefinir senha e inativar a conta ficam nos botões de ação da tabela
            de Usuários.
          </p>
        </>
      )}
    </Drawer>
  )
}
