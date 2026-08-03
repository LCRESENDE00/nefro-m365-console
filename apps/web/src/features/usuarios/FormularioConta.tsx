import {
  CLASSIFICACOES,
  PRODUTOS,
  REGIMES,
  TIPOS_CONTRATO,
  TIPOS_LICENCA,
} from '@nefro/dominio'
import { useEffect, useState, type ReactNode } from 'react'
import { Drawer } from '../../components/Drawer'
import { useToast } from '../../components/Toast'
import { catalogosRepo, contasRepo, licencasRepo, type Cadastro, type Conta } from '../../data'
import { useDados } from '../../lib/dados'
import { useConsulta } from '../../lib/useConsulta'
import estilos from './FormularioConta.module.css'

const VAZIO: Cadastro = {
  nome: '',
  upn: '',
  cargo: '',
  depto: '',
  unidade: '',
  cnpj: '',
  skuCodigo: '',
  classificacao: 'individual',
  regime: 'politica',
  tipoLicenca: 'principal',
  produto: '',
  tipoContrato: 'mensal',
  dataRenovacao: null,
  valorTotal: 0,
  mfa: false,
  ehRecurso: false,
}

const doCadastro = (conta: Conta): Cadastro => ({
  nome: conta.nome,
  upn: conta.upn,
  cargo: conta.cargo,
  depto: conta.depto,
  unidade: conta.unidade,
  cnpj: conta.cnpj,
  skuCodigo: conta.sku.codigo,
  classificacao: conta.classificacao,
  regime: conta.regime,
  tipoLicenca: conta.tipoLicenca,
  produto: conta.produto,
  tipoContrato: conta.tipoContrato,
  dataRenovacao: conta.dataRenovacao,
  valorTotal: conta.valorTotal,
  mfa: conta.mfa,
  ehRecurso: conta.ehRecurso,
})

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <label className={estilos.campo}>
      <span>{rotulo}</span>
      {children}
    </label>
  )
}

/** Garante que o valor gravado apareça na lista mesmo se saiu do catálogo. */
const comAtual = (opcoes: string[], atual: string) =>
  atual && !opcoes.includes(atual) ? [atual, ...opcoes] : opcoes

type Props = {
  aberto: boolean
  /** Conta em edição; `null` abre o formulário de cadastro novo. */
  conta: Conta | null
  aoFechar: () => void
}

/** Cadastro e edição de contas, no mesmo painel lateral do detalhe. */
export function FormularioConta({ aberto, conta, aoFechar }: Props) {
  const toast = useToast()
  const { versao, invalidar } = useDados()
  const [form, setForm] = useState<Cadastro>(VAZIO)
  const [salvando, setSalvando] = useState(false)

  const { dados: catalogos } = useConsulta(() => catalogosRepo.ler(), [versao, aberto])
  const { dados: licencas } = useConsulta(() => licencasRepo.resumo(), [versao])
  const planos = licencas?.planos ?? []
  const editando = Boolean(conta)

  useEffect(() => {
    if (aberto) setForm(conta ? doCadastro(conta) : VAZIO)
  }, [aberto, conta])

  const mudar = <C extends keyof Cadastro>(campo: C, valor: Cadastro[C]) =>
    setForm((atual) => ({ ...atual, [campo]: valor }))

  /** Trocar de plano reajusta o valor enquanto ele espelhar o preço do assento. */
  function trocarPlano(codigo: string) {
    const anterior = planos.find((p) => p.codigo === form.skuCodigo)?.preco ?? 0
    const novo = planos.find((p) => p.codigo === codigo)?.preco ?? 0
    setForm((atual) => ({
      ...atual,
      skuCodigo: codigo,
      valorTotal: atual.valorTotal === 0 || atual.valorTotal === anterior ? novo : atual.valorTotal,
    }))
  }

  async function salvar() {
    setSalvando(true)
    try {
      if (conta) {
        const { upn, ...mudancas } = form
        await contasRepo.atualizar(conta.upn, mudancas)
        toast(`Cadastro de ${form.nome} atualizado`)
      } else {
        await contasRepo.criar({ ...form, upn: form.upn.trim().toLowerCase() })
        toast(`Conta ${form.upn} criada`)
      }
      invalidar()
      aoFechar()
    } catch (falha) {
      toast((falha as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Drawer aberto={aberto} aoFechar={aoFechar}>
      <h2 className={estilos.titulo}>{editando ? 'Editar cadastro' : 'Nova conta'}</h2>
      <p className="muted" style={{ fontSize: 12.5, margin: '0 0 18px' }}>
        {editando
          ? 'O e-mail identifica a conta no tenant e não pode ser alterado aqui.'
          : 'A conta nasce sem histórico de acesso e aparece como “nunca acessou” até o primeiro login.'}
      </p>

      <form
        className={estilos.form}
        onSubmit={(evento) => {
          evento.preventDefault()
          void salvar()
        }}
      >
        <div className={estilos.secao}>Identificação</div>

        <Campo rotulo="Nome">
          <input value={form.nome} onChange={(e) => mudar('nome', e.target.value)} required />
        </Campo>

        <Campo rotulo="E-mail (UPN)">
          <input
            type="email"
            value={form.upn}
            onChange={(e) => mudar('upn', e.target.value)}
            disabled={editando}
            required
          />
        </Campo>

        <Campo rotulo="Cargo">
          <input value={form.cargo} onChange={(e) => mudar('cargo', e.target.value)} required />
        </Campo>

        <div className={estilos.secao}>Organização</div>

        <Campo rotulo="Unidade">
          <select
            value={form.unidade}
            onChange={(e) => mudar('unidade', e.target.value)}
            required
          >
            <option value="">Selecione…</option>
            {comAtual(catalogos?.unidades ?? [], form.unidade).map((unidade) => (
              <option key={unidade} value={unidade}>
                {unidade}
              </option>
            ))}
          </select>
        </Campo>

        <Campo rotulo="Setor">
          <select value={form.depto} onChange={(e) => mudar('depto', e.target.value)} required>
            <option value="">Selecione…</option>
            {comAtual(catalogos?.setores ?? [], form.depto).map((setor) => (
              <option key={setor} value={setor}>
                {setor}
              </option>
            ))}
          </select>
        </Campo>

        <Campo rotulo="CNPJ">
          <select value={form.cnpj} onChange={(e) => mudar('cnpj', e.target.value)} required>
            <option value="">Selecione…</option>
            {comAtual(catalogos?.cnpjs ?? [], form.cnpj).map((cnpj) => (
              <option key={cnpj} value={cnpj}>
                {cnpj}
              </option>
            ))}
          </select>
        </Campo>

        <div className={estilos.secao}>Licenciamento</div>

        <Campo rotulo="Plano do assento">
          <select value={form.skuCodigo} onChange={(e) => trocarPlano(e.target.value)} required>
            <option value="">Selecione…</option>
            {planos.map((plano) => (
              <option key={plano.codigo} value={plano.codigo}>
                {plano.nome}
              </option>
            ))}
          </select>
        </Campo>

        <div className={estilos.dupla}>
          <Campo rotulo="Tipo de licença">
            <select
              value={form.tipoLicenca}
              onChange={(e) => mudar('tipoLicenca', e.target.value as Cadastro['tipoLicenca'])}
            >
              {TIPOS_LICENCA.map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </Campo>

          <Campo rotulo="Produto contratado">
            <select value={form.produto} onChange={(e) => mudar('produto', e.target.value)} required>
              <option value="">Selecione…</option>
              {comAtual(PRODUTOS, form.produto).map((produto) => (
                <option key={produto} value={produto}>
                  {produto}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <div className={estilos.dupla}>
          <Campo rotulo="Classificação da conta">
            <select
              value={form.classificacao}
              onChange={(e) => mudar('classificacao', e.target.value as Cadastro['classificacao'])}
            >
              {CLASSIFICACOES.map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </Campo>

          <Campo rotulo="Regime da conta">
            <select
              value={form.regime}
              onChange={(e) => mudar('regime', e.target.value as Cadastro['regime'])}
            >
              {REGIMES.map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <div className={estilos.secao}>Contrato</div>

        <div className={estilos.dupla}>
          <Campo rotulo="Tipo de contrato">
            <select
              value={form.tipoContrato}
              onChange={(e) => mudar('tipoContrato', e.target.value as Cadastro['tipoContrato'])}
            >
              {TIPOS_CONTRATO.map(([valor, rotulo]) => (
                <option key={valor} value={valor}>
                  {rotulo}
                </option>
              ))}
            </select>
          </Campo>

          <Campo rotulo="Data de renovação">
            <input
              type="date"
              value={form.dataRenovacao ?? ''}
              onChange={(e) => mudar('dataRenovacao', e.target.value || null)}
            />
          </Campo>
        </div>

        <Campo rotulo="Valor total atribuído (R$/mês)">
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.valorTotal}
            onChange={(e) => mudar('valorTotal', Number(e.target.value))}
          />
        </Campo>

        <div className={estilos.marcas}>
          <label>
            <input
              type="checkbox"
              checked={form.mfa}
              onChange={(e) => mudar('mfa', e.target.checked)}
            />
            MFA configurado
          </label>
          <label>
            <input
              type="checkbox"
              checked={form.ehRecurso}
              onChange={(e) => mudar('ehRecurso', e.target.checked)}
            />
            Conta de recurso (sala, caixa compartilhada)
          </label>
        </div>

        <div className={estilos.acoes}>
          <button type="submit" className="btn btn-primary" disabled={salvando}>
            {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Criar conta'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={aoFechar}>
            Cancelar
          </button>
        </div>
      </form>
    </Drawer>
  )
}
