/**
 * Tipos do dominio do console: o contrato entre a UI e a camada de dados.
 * Os que a API tambem usa vem de `@nefro/dominio`, para nao existirem duas
 * definicoes do mesmo formato.
 */
import type { ContaCalculada } from '@nefro/dominio'

export type {
  Cadastro,
  Catalogos,
  ClassificacaoConta,
  ContaCalculada as Conta,
  FatiaDesperdicio,
  FiltroContas,
  Limiares,
  LicencaResumida as Licenca,
  PaginaContas,
  Plano,
  RegimeConta,
  ResumoArmazenamento,
  ResumoLicencas,
  StatusConta,
  TipoCatalogo,
  TipoContrato,
  TipoLicenca,
  VisaoGeral,
} from '@nefro/dominio'

export type ContaDetalhada = ContaCalculada & { serieAcessos: number[] }

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
