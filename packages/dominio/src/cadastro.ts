/**
 * Vocabulario e validacao do cadastro de contas.
 *
 * Fica no dominio porque a API precisa recusar um cadastro invalido e a tela
 * precisa montar os mesmos seletores: uma lista so, sem duas versoes da verdade.
 */
import type {
  Cadastro,
  ClassificacaoConta,
  RegimeConta,
  TipoContrato,
  TipoLicenca,
} from './tipos.js'

export const CLASSIFICACOES: Array<[ClassificacaoConta, string]> = [
  ['individual', 'Individual'],
  ['coletiva', 'Coletiva'],
]

export const REGIMES: Array<[RegimeConta, string]> = [
  ['politica', 'Dentro da política'],
  ['excecao', 'Exceção'],
]

export const TIPOS_LICENCA: Array<[TipoLicenca, string]> = [
  ['principal', 'Principal'],
  ['complementar', 'Complementar'],
  ['trial', 'Trial'],
  ['gratuita', 'Gratuita'],
]

export const TIPOS_CONTRATO: Array<[TipoContrato, string]> = [
  ['mensal', 'Mensal'],
  ['anual', 'Anual'],
]

/** Produtos que a operadora fatura. A lista cresce sem mexer em nenhuma tela. */
export const PRODUTOS = [
  'Microsoft 365 Premium',
  'Microsoft 365 Standard',
  'Microsoft 365 Basic',
  'Teams Essentials',
  'Exchange Online',
  'Power BI Pro',
  'Power BI Premium',
  'Project Plan 1',
  'Visio Plan 1',
]

const rotulo = <T extends string>(pares: Array<[T, string]>, chave: T) =>
  pares.find(([valor]) => valor === chave)?.[1] ?? chave

export const rotuloClassificacao = (v: ClassificacaoConta) => rotulo(CLASSIFICACOES, v)
export const rotuloRegime = (v: RegimeConta) => rotulo(REGIMES, v)
export const rotuloTipoLicenca = (v: TipoLicenca) => rotulo(TIPOS_LICENCA, v)
export const rotuloTipoContrato = (v: TipoContrato) => rotulo(TIPOS_CONTRATO, v)

/** `2027-03-05` -> `05/03/2027`. Data sem hora, entao nada de fuso horario aqui. */
export function dataBr(iso: string | null): string {
  if (!iso) return '—'
  const [ano, mes, dia] = iso.split('-')
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : iso
}

const UPN = /^[\w.+-]+@[\w-]+(\.[\w-]+)+$/
const DATA = /^\d{4}-\d{2}-\d{2}$/

/** Devolve a primeira mensagem de erro, ou `null` quando o cadastro esta valido. */
export function validarCadastro(dados: Partial<Cadastro>, parcial = false): string | null {
  const exigido = (campo: keyof Cadastro, mensagem: string) =>
    !parcial || campo in dados ? (String(dados[campo] ?? '').trim() ? null : mensagem) : null

  const obrigatorios =
    exigido('nome', 'Informe o nome da conta') ??
    exigido('cargo', 'Informe o cargo') ??
    exigido('depto', 'Escolha o setor') ??
    exigido('unidade', 'Escolha a unidade') ??
    exigido('cnpj', 'Escolha o CNPJ') ??
    exigido('produto', 'Escolha o produto contratado') ??
    exigido('skuCodigo', 'Escolha o tipo de licença do assento')

  if (obrigatorios) return obrigatorios

  if (!parcial || 'upn' in dados) {
    if (!UPN.test(String(dados.upn ?? '').trim())) return 'E-mail (UPN) inválido'
  }
  if (dados.dataRenovacao && !DATA.test(dados.dataRenovacao)) {
    return 'Data de renovação inválida'
  }
  if (dados.valorTotal !== undefined && (!Number.isFinite(dados.valorTotal) || dados.valorTotal < 0)) {
    return 'Valor total precisa ser um número maior ou igual a zero'
  }
  return null
}

/** Senha temporaria legivel, no formato que a TI dita por telefone. */
export function senhaTemporaria(sorteio: () => number = Math.random): string {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const bloco = (fonte: string, tamanho: number) =>
    Array.from({ length: tamanho }, () => fonte[Math.floor(sorteio() * fonte.length)]).join('')
  return `Nefro-${bloco(letras, 3)}${bloco('23456789', 4)}`
}
