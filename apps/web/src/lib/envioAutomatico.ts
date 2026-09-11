/**
 * Configuração do envio automático e situação do último disparo.
 *
 * A configuração mora em public/envio-automatico.json (publicada junto com o site) e é a
 * mesma que o job agendado lê no GitHub Actions — por isso a tela mostra exatamente o que
 * vai acontecer, e mudar destinatário ou desligar um envio é editar esse arquivo na main.
 */
import type { Precos } from './precosPadrao'

export type ConfigEnvio = {
  repositorio: string
  workflow: string
  remetente: string
  destinatarios: string[]
  resumoMensal: boolean
  alertaContaInativa: boolean
  limiarOcioso: number
  limiarInativo: number
  janelaAlertaDias: number
  /** Opcional: valor unitário por skuPartNumber; sem ele valem os de lib/precosPadrao.ts. */
  precos?: Precos
}

const CONFIG_PADRAO: ConfigEnvio = {
  repositorio: 'LCRESENDE00/nefro-m365-console',
  workflow: 'envio-automatico.yml',
  remetente: '',
  destinatarios: [],
  resumoMensal: false,
  alertaContaInativa: false,
  limiarOcioso: 30,
  limiarInativo: 90,
  janelaAlertaDias: 7,
}

/** Normaliza o JSON: campos faltando ou com tipo errado caem no padrão, sem quebrar a tela. */
export function normalizarConfigEnvio(bruto: unknown): ConfigEnvio {
  const b = (bruto && typeof bruto === 'object' ? bruto : {}) as Record<string, unknown>
  const texto = (valor: unknown, padrao: string) => (typeof valor === 'string' && valor.trim() ? valor.trim() : padrao)
  const inteiro = (valor: unknown, padrao: number) =>
    typeof valor === 'number' && Number.isFinite(valor) && valor > 0 ? Math.floor(valor) : padrao
  const destinatarios = Array.isArray(b.destinatarios)
    ? b.destinatarios.filter((d): d is string => typeof d === 'string' && d.includes('@')).map((d) => d.trim())
    : []
  const precos =
    b.precos && typeof b.precos === 'object'
      ? Object.fromEntries(
          Object.entries(b.precos as Record<string, unknown>).filter(
            (par): par is [string, number] => typeof par[1] === 'number' && Number.isFinite(par[1]) && par[1] >= 0,
          ),
        )
      : undefined
  return {
    repositorio: texto(b.repositorio, CONFIG_PADRAO.repositorio),
    workflow: texto(b.workflow, CONFIG_PADRAO.workflow),
    remetente: texto(b.remetente, CONFIG_PADRAO.remetente),
    destinatarios,
    resumoMensal: b.resumoMensal === true,
    alertaContaInativa: b.alertaContaInativa === true,
    limiarOcioso: inteiro(b.limiarOcioso, CONFIG_PADRAO.limiarOcioso),
    limiarInativo: inteiro(b.limiarInativo, CONFIG_PADRAO.limiarInativo),
    janelaAlertaDias: inteiro(b.janelaAlertaDias, CONFIG_PADRAO.janelaAlertaDias),
    precos: precos && Object.keys(precos).length > 0 ? precos : undefined,
  }
}

/** Lê o envio-automatico.json publicado junto com o site. */
export async function lerConfigEnvio(): Promise<ConfigEnvio> {
  const resposta = await fetch(import.meta.env.BASE_URL + 'envio-automatico.json', { cache: 'no-cache' })
  if (!resposta.ok) throw new Error('Não foi possível ler envio-automatico.json (' + resposta.status + ')')
  return normalizarConfigEnvio(await resposta.json())
}

export type UltimoDisparo = {
  quando: string
  /** Em andamento, concluído, falhou etc., já em português. */
  situacao: string
  sucesso: boolean | null
  /** "schedule" (agendado) ou "workflow_dispatch" (disparado à mão). */
  origem: string
  link: string
}

const SITUACOES: Record<string, string> = {
  success: 'concluído',
  failure: 'falhou',
  cancelled: 'cancelado',
  timed_out: 'expirou',
  skipped: 'pulado',
  action_required: 'aguardando aprovação',
  neutral: 'concluído',
}

/**
 * Último disparo do job no GitHub Actions. O repositório é público, então a API do
 * GitHub responde sem token (limite de 60 consultas por hora por IP — de sobra aqui).
 */
export async function lerUltimoDisparo(config: ConfigEnvio): Promise<UltimoDisparo | null> {
  const url = `https://api.github.com/repos/${config.repositorio}/actions/workflows/${config.workflow}/runs?per_page=1&exclude_pull_requests=true`
  const resposta = await fetch(url, { headers: { Accept: 'application/vnd.github+json' } })
  if (!resposta.ok) throw new Error('GitHub respondeu ' + resposta.status)
  const dados = await resposta.json()
  const execucao = dados.workflow_runs?.[0]
  if (!execucao) return null
  const emAndamento = execucao.status !== 'completed'
  return {
    quando: execucao.run_started_at ?? execucao.created_at,
    situacao: emAndamento ? 'em andamento' : SITUACOES[execucao.conclusion] ?? String(execucao.conclusion ?? 'desconhecido'),
    sucesso: emAndamento ? null : execucao.conclusion === 'success',
    origem: execucao.event,
    link: execucao.html_url,
  }
}

export const linkEditarConfig = (config: ConfigEnvio) =>
  `https://github.com/${config.repositorio}/edit/main/apps/web/public/envio-automatico.json`

export const linkWorkflow = (config: ConfigEnvio) => `https://github.com/${config.repositorio}/actions/workflows/${config.workflow}`
