/**
 * Envio automático dos relatórios por e-mail — roda no GitHub Actions
 * (.github/workflows/envio-automatico.yml), sem ninguém logado no console.
 *
 *   npx tsx apps/web/scripts/envio-automatico.ts resumo-mensal
 *   npx tsx apps/web/scripts/envio-automatico.ts alerta-inativas
 *
 * O que ele faz: pega um token de aplicativo no Entra ID, lê licenças, contas e MFA na
 * Microsoft Graph, monta o e-mail com as mesmas funções da tela Relatórios
 * (src/lib/resumoEmail.ts) e envia pela caixa do remetente (POST /users/{remetente}/sendMail).
 *
 * Credencial (uma das duas):
 *  - federação com o GitHub Actions (sem segredo guardado): o workflow tem `id-token: write`
 *    e o app registration tem uma "credencial federada" apontando para este repositório;
 *  - ou AZURE_CLIENT_SECRET nos secrets do repositório (segredo de cliente do app registration).
 *
 * Variáveis: AZURE_TENANT_ID, AZURE_CLIENT_ID (as mesmas VITE_MSAL_* do site), AZURE_CLIENT_SECRET
 * (opcional), ENVIO_APENAS_GERAR=1 (gera o HTML em ./email-gerado/ e não envia).
 * Configuração de destinatário, remetente e janelas: apps/web/public/envio-automatico.json.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { corpoSendMail, type MensagemEmail } from '../src/lib/email'
import { normalizarConfigEnvio, type ConfigEnvio } from '../src/lib/envioAutomatico'
import {
  mapearLicenca,
  mapearRegistroMfa,
  mapearUsuario,
  SELECAO_USUARIOS,
  type LicencaReal,
  type RegistroMfa,
  type UsuarioReal,
} from '../src/lib/graphModelos'
import { PRECOS_PADRAO } from '../src/lib/precosPadrao'
import { montarAlertaInativas, montarResumoMensal, type EmailPronto } from '../src/lib/resumoEmail'

type Tipo = 'resumo-mensal' | 'alerta-inativas'

const GRAPH = process.env.GRAPH_BASE_URL ?? 'https://graph.microsoft.com/v1.0'
const LOGIN = process.env.LOGIN_BASE_URL ?? 'https://login.microsoftonline.com'
const PASTA_SCRIPT = dirname(fileURLToPath(import.meta.url))
const ARQUIVO_CONFIG = join(PASTA_SCRIPT, '..', 'public', 'envio-automatico.json')

function log(mensagem: string) {
  console.log(`[envio-automatico] ${mensagem}`)
}

function falhar(mensagem: string): never {
  console.error(`[envio-automatico] ERRO: ${mensagem}`)
  process.exit(1)
}

function lerConfig(): ConfigEnvio {
  try {
    return normalizarConfigEnvio(JSON.parse(readFileSync(ARQUIVO_CONFIG, 'utf8')))
  } catch (falha) {
    return falhar(`não consegui ler ${ARQUIVO_CONFIG}: ${(falha as Error).message}`)
  }
}

// ---------- token de aplicativo ----------

/** Token OIDC que o GitHub Actions emite para o job (precisa de `permissions: id-token: write`). */
async function tokenDoGitHub(): Promise<string> {
  const url = process.env.ACTIONS_ID_TOKEN_REQUEST_URL
  const token = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN
  if (!url || !token) throw new Error('fora do GitHub Actions (ou o workflow está sem `id-token: write`)')
  const resposta = await fetch(`${url}&audience=api://AzureADTokenExchange`, {
    headers: { Authorization: `bearer ${token}` },
  })
  if (!resposta.ok) throw new Error(`o GitHub não emitiu o token OIDC (${resposta.status})`)
  const dados = (await resposta.json()) as { value?: string }
  if (!dados.value) throw new Error('o GitHub devolveu um token OIDC vazio')
  return dados.value
}

async function obterTokenGraph(): Promise<string> {
  const tenant = process.env.AZURE_TENANT_ID
  const clientId = process.env.AZURE_CLIENT_ID
  if (!tenant || !clientId) falhar('defina AZURE_TENANT_ID e AZURE_CLIENT_ID (no repositório, as variáveis VITE_MSAL_TENANT_ID e VITE_MSAL_CLIENT_ID)')

  const parametros = new URLSearchParams({
    client_id: clientId,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  })
  const segredo = process.env.AZURE_CLIENT_SECRET
  if (segredo) {
    parametros.set('client_secret', segredo)
    log('autenticando com segredo de cliente')
  } else {
    parametros.set('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer')
    parametros.set('client_assertion', await tokenDoGitHub())
    log('autenticando por federação com o GitHub Actions (sem segredo)')
  }

  const resposta = await fetch(`${LOGIN}/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: parametros,
  })
  const dados = (await resposta.json().catch(() => ({}))) as { access_token?: string; error?: string; error_description?: string }
  if (!resposta.ok || !dados.access_token) {
    falhar(
      `o Entra ID recusou a credencial (${resposta.status} ${dados.error ?? ''}): ${dados.error_description ?? 'sem detalhe'}. ` +
        'Confira docs/envio-automatico.md (credencial federada ou AZURE_CLIENT_SECRET, e o consentimento das permissões de aplicativo).',
    )
  }
  return dados.access_token
}

// ---------- leitura da Graph ----------

async function graphGet<T>(token: string, caminho: string): Promise<T[]> {
  const itens: T[] = []
  let url: string | null = caminho.startsWith('http') ? caminho : GRAPH + caminho
  while (url) {
    const resposta: Response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!resposta.ok) {
      const corpo = await resposta.text().catch(() => '')
      throw new Error(`Microsoft Graph respondeu ${resposta.status} em ${caminho}${corpo ? ': ' + corpo.slice(0, 300) : ''}`)
    }
    const dados = (await resposta.json()) as { value?: T[]; '@odata.nextLink'?: string }
    itens.push(...(dados.value ?? []))
    url = dados['@odata.nextLink'] ?? null
  }
  return itens
}

async function lerDados(token: string) {
  const agora = Date.now()
  const licencas: LicencaReal[] = (await graphGet<any>(token, '/subscribedSkus')).map(mapearLicenca)
  log(`${licencas.length} planos lidos`)
  const usuarios: UsuarioReal[] = (await graphGet<any>(token, `/users?$select=${SELECAO_USUARIOS}&$top=999`)).map((u) =>
    mapearUsuario(u, agora),
  )
  log(`${usuarios.length} contas lidas`)
  let mfa: RegistroMfa[] | null = null
  try {
    mfa = (await graphGet<any>(token, '/reports/authenticationMethods/userRegistrationDetails?$top=999')).map(mapearRegistroMfa)
    log(`${mfa.length} registros de MFA lidos`)
  } catch (falha) {
    log(`relatório de MFA indisponível, o e-mail sai sem essa linha: ${(falha as Error).message}`)
  }
  return { licencas, usuarios, mfa }
}

// ---------- envio ----------

async function enviar(token: string, remetente: string, mensagem: MensagemEmail) {
  const corpo = corpoSendMail(mensagem, (texto) => Buffer.from(texto, 'utf8').toString('base64'))
  const resposta = await fetch(`${GRAPH}/users/${encodeURIComponent(remetente)}/sendMail`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  })
  if (!resposta.ok) {
    const texto = await resposta.text().catch(() => '')
    throw new Error(`a Graph recusou o envio (${resposta.status}) pela caixa ${remetente}${texto ? ': ' + texto.slice(0, 400) : ''}`)
  }
}

function salvarParaConferencia(email: EmailPronto) {
  const pasta = join(process.cwd(), 'email-gerado')
  mkdirSync(pasta, { recursive: true })
  writeFileSync(join(pasta, 'email.html'), email.html, 'utf8')
  writeFileSync(join(pasta, 'assunto.txt'), email.assunto + '\n', 'utf8')
  for (const anexo of email.anexos) writeFileSync(join(pasta, anexo.nome), anexo.conteudo, 'utf8')
  log(`e-mail gerado em ${pasta} (assunto: "${email.assunto}", ${email.anexos.length} anexos) — não enviado, ENVIO_APENAS_GERAR está ligado`)
}

// ---------- principal ----------

async function principal() {
  const tipo = process.argv[2] as Tipo | undefined
  if (tipo !== 'resumo-mensal' && tipo !== 'alerta-inativas') {
    falhar('informe o tipo: resumo-mensal ou alerta-inativas')
  }

  const config = lerConfig()
  const apenasGerar = process.env.ENVIO_APENAS_GERAR === '1' || process.env.ENVIO_APENAS_GERAR === 'true'

  if (tipo === 'resumo-mensal' && !config.resumoMensal) {
    log('resumo mensal está desligado em envio-automatico.json — nada a fazer')
    return
  }
  if (tipo === 'alerta-inativas' && !config.alertaContaInativa) {
    log('alerta de conta inativa está desligado em envio-automatico.json — nada a fazer')
    return
  }
  if (config.destinatarios.length === 0) falhar('nenhum destinatário em envio-automatico.json')
  if (!config.remetente) falhar('remetente não definido em envio-automatico.json')

  const token = await obterTokenGraph()
  const dados = await lerDados(token)
  const entrada = {
    ...dados,
    precos: { ...PRECOS_PADRAO, ...(config.precos ?? {}) },
    limiarOcioso: config.limiarOcioso,
    limiarInativo: config.limiarInativo,
  }

  const email =
    tipo === 'resumo-mensal'
      ? montarResumoMensal(entrada)
      : montarAlertaInativas({ ...entrada, janelaDias: config.janelaAlertaDias })

  if (!email) {
    log(`nenhuma conta passou de ${config.limiarInativo} dias sem acesso nos últimos ${config.janelaAlertaDias} dias — nada a enviar`)
    return
  }

  if (apenasGerar) {
    salvarParaConferencia(email)
    return
  }

  await enviar(token, config.remetente, {
    destinatarios: config.destinatarios,
    assunto: email.assunto,
    html: email.html,
    anexos: email.anexos,
  })
  log(`enviado: "${email.assunto}" de ${config.remetente} para ${config.destinatarios.join(', ')}`)
}

principal().catch((falha: Error) => falhar(falha.message))
