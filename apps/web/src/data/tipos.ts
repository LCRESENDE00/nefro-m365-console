/** Tipos do dominio do console. Sao o contrato entre a UI e a camada de dados. */

export type StatusConta = 'ativo' | 'ocioso' | 'inativo' | 'nunca'

export type Licenca = {
  codigo: string
  nome: string
  curto: string
  preco: number
  cor: string
}

export type Conta = {
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
  sku: Licenca
}

export type ContaDetalhada = Conta & { serieAcessos: number[] }

export type FiltroContas = {
  q: string
  depto: string
  status: StatusConta | 'todos'
  sort: 'nome' | 'dias' | 'gb'
  dir: 1 | -1
}

export type PaginaContas = {
  contas: Conta[]
  total: number
  deptos: string[]
  custoSelecao: number
}

export type FatiaDesperdicio = { codigo: string; curto: string; cor: string; valor: number }

export type VisaoGeral = {
  limiares: { limiarOcioso: number; limiarInativo: number; incluirRecursos: boolean }
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
  precisamRevisao: Conta[]
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

export type Exportacao = {
  id: number
  arquivo: string
  geradoPor: string
  linhas: number
  criadoEm: string
}

export type CatalogoRelatorios = {
  disponiveis: Array<{ tipo: string; titulo: string }>
  historico: Exportacao[]
  envioAutomatico: {
    resumoMensal: boolean
    alertaContaInativa: boolean
    copiaPastaTI: boolean
    destinatario: string
  }
}

export type Configuracoes = {
  tenantId: string
  clientId: string
  contaConectada: string
  limiarOcioso: number
  limiarInativo: number
  atualizarAoAbrir: boolean
  incluirRecursos: boolean
  modoDemo: boolean
  resumoMensal: boolean
  alertaContaInativa: boolean
  copiaPastaTI: boolean
  permissoes: string[]
  marcadasParaRevisao: string[]
}
