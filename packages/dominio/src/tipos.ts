/** Formatos que atravessam a fronteira API <-> UI (e a demo estatica). */

export type StatusConta = 'ativo' | 'ocioso' | 'inativo' | 'nunca'

/** Uma pessoa (individual) ou uma conta compartilhada por um grupo (coletiva). */
export type ClassificacaoConta = 'individual' | 'coletiva'

/** Se o vinculo segue a politica de licenciamento ou foi aberto como excecao. */
export type RegimeConta = 'politica' | 'excecao'

/** Como o assento foi concedido. */
export type TipoLicenca = 'principal' | 'complementar' | 'trial' | 'gratuita'

export type TipoContrato = 'mensal' | 'anual'

export type Limiares = {
  limiarOcioso: number
  limiarInativo: number
  incluirRecursos: boolean
}

export type LicencaResumida = {
  codigo: string
  nome: string
  curto: string
  preco: number
  cor: string
}

/** Conta ja com o status resolvido: e o que toda tela e todo calculo consomem. */
export type ContaCalculada = {
  id: number
  nome: string
  upn: string
  cargo: string
  depto: string
  unidade: string
  cnpj: string
  diasUltimoAcesso: number | null
  mfa: boolean
  oneDriveGb: number
  arquivos: number
  ehRecurso: boolean
  /** `false` = conta inativada por aqui; e o `accountEnabled` do Graph. */
  habilitada: boolean
  classificacao: ClassificacaoConta
  regime: RegimeConta
  tipoLicenca: TipoLicenca
  /** Produto contratado comercialmente; pode nao coincidir com o SKU do assento. */
  produto: string
  tipoContrato: TipoContrato
  /** `YYYY-MM-DD`, ou `null` quando o contrato nao tem renovacao marcada. */
  dataRenovacao: string | null
  /** Custo mensal total atribuido a conta (assento + complementos). */
  valorTotal: number
  status: StatusConta
  sku: LicencaResumida
}

/** Campos editaveis de uma conta. O `upn` identifica e nao muda depois de criado. */
export type Cadastro = {
  nome: string
  upn: string
  cargo: string
  depto: string
  unidade: string
  cnpj: string
  skuCodigo: string
  classificacao: ClassificacaoConta
  regime: RegimeConta
  tipoLicenca: TipoLicenca
  produto: string
  tipoContrato: TipoContrato
  dataRenovacao: string | null
  valorTotal: number
  mfa: boolean
  ehRecurso: boolean
}

export type FiltroContas = {
  q: string
  depto: string
  unidade: string
  tipoLicenca: TipoLicenca | 'todos'
  classificacao: ClassificacaoConta | 'todos'
  regime: RegimeConta | 'todos'
  produto: string
  status: StatusConta | 'todos'
  sort: 'nome' | 'dias' | 'gb' | 'valor' | 'renovacao'
  dir: 1 | -1
}

export type PaginaContas = {
  contas: ContaCalculada[]
  total: number
  deptos: string[]
  unidades: string[]
  produtos: string[]
  custoSelecao: number
}

/** Listas padronizadas mantidas na area administrativa. */
export type TipoCatalogo = 'setor' | 'unidade' | 'cnpj'

export type Catalogos = {
  setores: string[]
  unidades: string[]
  cnpjs: string[]
}

export type FatiaDesperdicio = { codigo: string; curto: string; cor: string; valor: number }

export type VisaoGeral = {
  limiares: Limiares
  totalContas: number
  ativos: number
  ociosos: number
  inativos: number
  semMfa: number
  totalPessoas: number
  desperdicioTotal: number
  desperdicioPorSku: FatiaDesperdicio[]
  serieAcessos: number[]
  distribuicaoAcesso: Array<{ faixa: string; valor: number; cor: string }>
  precisamRevisao: ContaCalculada[]
}

export type Plano = {
  codigo: string
  nome: string
  curto: string
  cor: string
  preco: number
  comprados: number
  atribuidos: number
  emUso: number
  semAcesso: number
  livres: number
  custoMensal: number
  custoDesperdicado: number
}

export type ResumoLicencas = {
  planos: Plano[]
  custoAtribuido: number
  custoContratado: number
  assentosLivres: number
  economiaPossivel: number
  totalContas: number
}

export type ResumoArmazenamento = {
  quotaGb: number
  totalGb: number
  totalArquivos: number
  gbEmContasInativas: number
  maiores: Array<{ nome: string; upn: string; oneDriveGb: number; status: StatusConta }>
  porSetor: Array<{ setor: string; gb: number }>
}

export type Planilha = { cabecalho: string[]; linhas: Array<Array<string | number>> }
