/**
 * Ponto unico de acesso a dados. As telas importam daqui e nunca de `http/`,
 * entao trocar a implementacao e mexer so nestas linhas.
 */
import {
  armazenamentoHttp,
  configuracoesHttp,
  contasHttp,
  licencasHttp,
  metricasHttp,
  relatoriosHttp,
} from './http'

export const contasRepo = contasHttp
export const metricasRepo = metricasHttp
export const licencasRepo = licencasHttp
export const armazenamentoRepo = armazenamentoHttp
export const relatoriosRepo = relatoriosHttp
export const configuracoesRepo = configuracoesHttp

export * from './tipos'
export * from './repositorios'
