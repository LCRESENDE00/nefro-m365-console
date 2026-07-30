/** Formatos que atravessam a fronteira API <-> UI (e a demo estatica). */

export type StatusConta = 'ativo' | 'ocioso' | 'inativo' | 'nunca'

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
  diasUltimoAcesso: number | null
  mfa: boolean
  oneDriveGb: number
  arquivos: number
  ehRecurso: boolean
  status: StatusConta
  sku: LicencaResumida
}

export type FiltroContas = {
  q: string
  depto: string
  status: StatusConta | 'todos'
  sort: 'nome' | 'dias' | 'gb'
  dir: 1 | -1
}

export type PaginaContas = {
  contas: ContaCalculada[]
  total: number
  deptos: string[]
  custoSelecao: number
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
