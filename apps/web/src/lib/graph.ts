import { garantirMsalInicializado, msalInstance } from './msalClient'

/** Escopos pedidos de uma vez so, para nao abrir varios popups. */
export const ESCOPOS_REAIS = [
  'Organization.Read.All',
  'User.Read.All',
  'User.ReadWrite.All',
  'AuditLog.Read.All',
  'Reports.Read.All',
]

async function tokenReal(): Promise<string> {
  await garantirMsalInicializado()
  const contas = msalInstance.getAllAccounts()
  if (contas.length > 0) {
    try {
      const silencioso = await msalInstance.acquireTokenSilent({
        scopes: ESCOPOS_REAIS,
        account: contas[0],
      })
      return silencioso.accessToken
    } catch {
      // token expirou ou faltam escopos: cai para o popup abaixo
    }
  }
  const resultado = await msalInstance.loginPopup({ scopes: ESCOPOS_REAIS })
  return resultado.accessToken
}

/** Abre o login real da Microsoft (popup) e devolve a conta conectada. Usado na tela de entrada do app. */
export async function entrarComMicrosoft(): Promise<{ nome?: string; upn: string }> {
  await garantirMsalInicializado()
  const contas = msalInstance.getAllAccounts()
  if (contas.length > 0) {
    const conta = contas[0]
    return { nome: conta.name ?? conta.username, upn: conta.username }
  }
  const resultado = await msalInstance.loginPopup({ scopes: ESCOPOS_REAIS })
  const conta = resultado.account
  return { nome: conta?.name ?? conta?.username, upn: conta?.username ?? '' }
}

async function chamarGraph(caminho: string, aceitar?: string): Promise<Response> {
  const token = await tokenReal()
  const cabecalhos: Record<string, string> = { Authorization: 'Bearer ' + token }
  if (aceitar) cabecalhos['Accept'] = aceitar
  const resposta = await fetch('https://graph.microsoft.com/v1.0' + caminho, { headers: cabecalhos })
  if (!resposta.ok) {
    const corpo = await resposta.text().catch(() => '')
    throw new Error('Microsoft Graph respondeu ' + resposta.status + ' em ' + caminho + (corpo ? ': ' + corpo.slice(0, 200) : ''))
  }
  return resposta
}

/** Chamada de escrita (POST/PATCH/DELETE) na Microsoft Graph, com o token real do usuario logado. */
async function chamarGraphEscrita(caminho: string, metodo: 'POST' | 'PATCH' | 'DELETE', corpo?: unknown): Promise<Response> {
  const token = await tokenReal()
  const cabecalhos: Record<string, string> = {
    Authorization: 'Bearer ' + token,
    'Content-Type': 'application/json',
  }
  const resposta = await fetch('https://graph.microsoft.com/v1.0' + caminho, {
    method: metodo,
    headers: cabecalhos,
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
  })
  if (!resposta.ok) {
    const texto = await resposta.text().catch(() => '')
    let mensagem = texto
    try {
      const json = JSON.parse(texto)
      mensagem = json?.error?.message ?? texto
    } catch {
      // corpo nao era JSON, usa o texto puro
    }
    throw new Error('Microsoft Graph respondeu ' + resposta.status + ' em ' + caminho + (mensagem ? ': ' + mensagem.slice(0, 300) : ''))
  }
  return resposta
}

export async function lerContaConectada() {
  await garantirMsalInicializado()
  const contas = msalInstance.getAllAccounts()
  const conta = contas[0]
  return conta ? { nome: conta.name ?? conta.username, upn: conta.username } : null
}

/** Nomes amigaveis para os codigos tecnicos (skuPartNumber) que a Microsoft Graph devolve. */
const NOMES_LICENCAS: Record<string, string> = {
  MICROSOFT_365_COPILOT_FOR_BUSINESS: 'Microsoft 365 Copilot',
  O365_BUSINESS_ESSENTIALS: 'Microsoft 365 Business Basic',
  O365_BUSINESS_PREMIUM: 'Microsoft 365 Business Standard',
  SPB: 'Microsoft 365 Business Premium',
  SPE_E3: 'Microsoft 365 E3',
  SPE_E5: 'Microsoft 365 E5',
  ENTERPRISEPACK: 'Office 365 E3',
  ENTERPRISEPREMIUM: 'Office 365 E5',
  ENTERPRISEPREMIUM_NOPSTNCONF: 'Office 365 E5 (sem audioconferencia)',
  STANDARDPACK: 'Office 365 E1',
  DESKLESSPACK: 'Office 365 F3',
  EXCHANGESTANDARD: 'Exchange Online (Plano 1)',
  EXCHANGEENTERPRISE: 'Exchange Online (Plano 2)',
  EXCHANGEARCHIVE_ADDON: 'Exchange Online Archiving',
  POWER_BI_PRO: 'Power BI Pro',
  POWER_BI_STANDARD: 'Power BI (gratuito)',
  POWERAUTOMATE_ATTENDED_RPA: 'Power Automate por usuario com RPA assistida',
  POWERAPPS_DEV: 'Power Apps para desenvolvedores',
  POWERAPPS_VIRAL: 'Power Apps (avaliacao)',
  FLOW_FREE: 'Power Automate (gratuito)',
  'Teams_Premium_(for_Departments)': 'Microsoft Teams Premium',
  Microsoft_Teams_Rooms_Pro: 'Microsoft Teams Rooms Pro',
  MCOMEETADV: 'Microsoft Teams Audio Conferencing',
  MCOPSTN1: 'Microsoft Teams Chamadas Nacionais',
  WINDOWS_STORE: 'Windows Store',
  WIN10_PRO_ENT_SUB: 'Windows 10/11 Enterprise',
  EMS: 'Enterprise Mobility + Security E3',
  EMSPREMIUM: 'Enterprise Mobility + Security E5',
  AAD_PREMIUM: 'Microsoft Entra ID P1',
  AAD_PREMIUM_P2: 'Microsoft Entra ID P2',
  RIGHTSMANAGEMENT: 'Azure Information Protection',
  VISIOCLIENT: 'Visio Plan 2',
  PROJECTPROFESSIONAL: 'Project Plan 3',
  PROJECTPREMIUM: 'Project Plan 5',
  MEETING_ROOM: 'Microsoft Teams Rooms Standard',
}

/** Devolve um nome legivel para a licenca; se nao conhecer o codigo, so troca "_" por espaco. */
export function nomeAmigavelLicenca(skuPartNumber: string): string {
  return NOMES_LICENCAS[skuPartNumber] ?? skuPartNumber.replace(/_/g, ' ')
}

export type LicencaReal = {
  skuId: string
  skuPartNumber: string
  nome: string
  comprados: number
  emUso: number
  livres: number
 provavelAutosservico: boolean
}

export async function lerLicencas(): Promise<LicencaReal[]> {
  const resposta = await chamarGraph('/subscribedSkus')
  const dados = await resposta.json()
  return (dados.value ?? []).map((sku: any) => {
    const comprados = sku.prepaidUnits ? sku.prepaidUnits.enabled ?? 0 : 0
    const emUso = sku.consumedUnits ?? 0
    return {
      skuId: sku.skuId,
      skuPartNumber: sku.skuPartNumber,
      nome: nomeAmigavelLicenca(sku.skuPartNumber),
      comprados,
      emUso,
      livres: comprados - emUso,
 provavelAutosservico: comprados >= 5000,
    }
  })
}

export type UsuarioReal = {
  id: string
  nome: string
  upn: string
  habilitada: boolean
  diasUltimoAcesso: number | null
 ultimoAcessoIso: string | null
  skuIds: string[]
  totalLicencas: number
 departamento: string | null
 externo: boolean
}

export async function lerUsuarios(): Promise<UsuarioReal[]> {
  const resposta = await chamarGraph(
    '/users?$select=id,displayName,userPrincipalName,accountEnabled,signInActivity,assignedLicenses,department,userType&$top=999',
  )
  const dados = await resposta.json()
  const agora = Date.now()
  return (dados.value ?? []).map((u: any) => {
    const ultimo = u.signInActivity ? u.signInActivity.lastSignInDateTime : null
    const dias = ultimo ? Math.floor((agora - new Date(ultimo).getTime()) / 86400000) : null
    const skuIds = (u.assignedLicenses ?? []).map((l: any) => l.skuId as string)
    return {
      id: u.id,
      nome: u.displayName ?? u.userPrincipalName,
      upn: u.userPrincipalName,
      habilitada: !!u.accountEnabled,
      diasUltimoAcesso: dias,
 ultimoAcessoIso: ultimo,
      skuIds,
      totalLicencas: skuIds.length,
 departamento: u.department ?? null,
 externo: u.userType === 'Guest',
    }
  })
}

export type RegistroMfa = { upn: string; mfaRegistrado: boolean }

export async function lerRegistroMfa(): Promise<RegistroMfa[]> {
  const resposta = await chamarGraph('/reports/authenticationMethods/userRegistrationDetails?$top=999')
  const dados = await resposta.json()
  return (dados.value ?? []).map((r: any) => ({
    upn: r.userPrincipalName,
    mfaRegistrado: !!r.isMfaRegistered,
  }))
}

export type ContaArmazenamento = { upn: string; nome: string; gb: number }

function acharCampo(registro: Record<string, string>, opcoes: string[]): string {
  const chaves = Object.keys(registro)
  for (const opcao of opcoes) {
    const achada = chaves.find((c) => c.trim().toLowerCase() === opcao.toLowerCase())
    if (achada) return registro[achada]
  }
  return ''
}

/** CSV simples com suporte a campos entre aspas (os relatorios da Graph usam esse formato). */
function analisarCsv(texto: string): Array<Record<string, string>> {
  const linhas = texto.trim().split(/\r?\n/)
  if (linhas.length < 2) return []
  function dividir(linha: string): string[] {
    const campos: string[] = []
    let atual = ''
    let dentroAspas = false
    for (let i = 0; i < linha.length; i++) {
      const c = linha[i]
      if (c === '"') {
        dentroAspas = !dentroAspas
      } else if (c === ',' && !dentroAspas) {
        campos.push(atual)
        atual = ''
      } else {
        atual += c
      }
    }
    campos.push(atual)
    return campos
  }
  const cabecalho = dividir(linhas[0])
  return linhas.slice(1).filter(Boolean).map((linha) => {
    const valores = dividir(linha)
    const registro: Record<string, string> = {}
    cabecalho.forEach((campo, indice) => {
      registro[campo] = valores[indice] ?? ''
    })
    return registro
  })
}

export async function lerArmazenamento(): Promise<ContaArmazenamento[]> {
  let resposta: Response
  try {
    resposta = await chamarGraph("/reports/getOneDriveUsageAccountDetail(period='D7')", 'text/csv')
  } catch {
    throw new Error(
      'A Microsoft bloqueia esse relatorio quando chamado direto do navegador (o link de download nao libera CORS). ' +
        'So funciona com um servidor por tras (backend) buscando esse dado, nao rodando so no site estatico.',
    )
  }
  const texto = await resposta.text()
  const linhas = analisarCsv(texto)
  return linhas
    .map((linha) => {
      const upn = acharCampo(linha, ['Owner Principal Name', 'Owner Principal Name (Owner)'])
      const nome = acharCampo(linha, ['Owner Display Name'])
      const bytes = Number(acharCampo(linha, ['Storage Used (Byte)']) || '0')
      return { upn, nome, gb: bytes / 1024 ** 3 }
    })
    .filter((c) => c.upn)
}

/** Gera uma senha temporaria forte (letras maiusculas/minusculas, numeros e simbolo). */
export function gerarSenhaTemporaria(): string {
  const maiusculas = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const minusculas = 'abcdefghijkmnopqrstuvwxyz'
  const numeros = '23456789'
  const simbolos = '!@#$%*?'
  function aleatorio(conjunto: string): string {
    return conjunto[Math.floor(Math.random() * conjunto.length)]
  }
  let senha = aleatorio(maiusculas) + aleatorio(minusculas) + aleatorio(numeros) + aleatorio(simbolos)
  const todos = maiusculas + minusculas + numeros + simbolos
  for (let i = 0; i < 8; i++) senha += aleatorio(todos)
  return senha
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('')
}

export type NovoUsuario = {
  nome: string
  upn: string
  senha: string
}

/** Cria um usuario de verdade no tenant via Microsoft Graph (POST /users). Acao real e irreversivel por aqui. */
export async function criarUsuario(dados: NovoUsuario): Promise<{ id: string }> {
  const apelido = dados.upn.split('@')[0].replace(/[^a-zA-Z0-9.\-_]/g, '')
  const resposta = await chamarGraphEscrita('/users', 'POST', {
    accountEnabled: true,
    displayName: dados.nome,
    mailNickname: apelido,
    userPrincipalName: dados.upn,
    passwordProfile: {
      forceChangePasswordNextSignIn: true,
      password: dados.senha,
    },
  })
  const criado = await resposta.json()
  return { id: criado.id }
}

/** Redefine a senha de uma conta real (PATCH /users/{id}). Gera senha temporaria com troca obrigatoria. */
export async function redefinirSenha(id: string, novaSenha: string): Promise<void> {
  await chamarGraphEscrita('/users/' + id, 'PATCH', {
    passwordProfile: {
      forceChangePasswordNextSignIn: true,
      password: novaSenha,
    },
  })
}

/** Ativa ou desativa uma conta real (PATCH /users/{id} accountEnabled). Reversivel, mas grava no tenant de verdade. */
export async function definirHabilitada(id: string, habilitada: boolean): Promise<void> {
  await chamarGraphEscrita('/users/' + id, 'PATCH', { accountEnabled: habilitada })
}

export async function removerTodasLicencas(id: string, skuIds: string[]): Promise<void> {
await chamarGraphEscrita('/users/' + id + '/assignLicense', 'POST', {
addLicenses: [],
removeLicenses: skuIds,
})
}
