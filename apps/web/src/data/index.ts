/**
 * Ponto unico de acesso a dados.
 *
 * As telas importam daqui e nunca de `http/` ou `estatico/` — e por isso que a
 * mesma interface roda contra a API Express em desenvolvimento e sem backend
 * nenhum no modo local (`npm run local`). A escolha acontece nestas linhas.
 */
import {
  armazenamentoEstatico,
  catalogosEstatico,
  configuracoesEstatico,
  contasEstatico,
  licencasEstatico,
  metricasEstatico,
  relatoriosEstatico,
} from './estatico'
import {
  armazenamentoHttp,
  catalogosHttp,
  configuracoesHttp,
  contasHttp,
  licencasHttp,
  metricasHttp,
  relatoriosHttp,
} from './http'

/** Definido no build local sem API (`vite build --mode estatico`, arquivo .env.estatico). */
export const SEM_BACKEND = import.meta.env.VITE_SEM_BACKEND === 'true'

export const contasRepo = SEM_BACKEND ? contasEstatico : contasHttp
export const metricasRepo = SEM_BACKEND ? metricasEstatico : metricasHttp
export const licencasRepo = SEM_BACKEND ? licencasEstatico : licencasHttp
export const armazenamentoRepo = SEM_BACKEND ? armazenamentoEstatico : armazenamentoHttp
export const relatoriosRepo = SEM_BACKEND ? relatoriosEstatico : relatoriosHttp
export const configuracoesRepo = SEM_BACKEND ? configuracoesEstatico : configuracoesHttp
export const catalogosRepo = SEM_BACKEND ? catalogosEstatico : catalogosHttp

export * from './tipos'
export * from './repositorios'
