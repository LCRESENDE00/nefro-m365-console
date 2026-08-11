import { garantirMsalInicializado, msalInstance } from './msalClient'

/** Escopos pedidos de uma vez so, para nao abrir varios popups. */
export const ESCOPOS_REAIS = [
  'Organization.Read.All',
  'User.Read.All',
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

export async function lerContaConectada() {
  await garantirMsalInicializado()
  const contas = msalInstance.getAllAccounts()
  const conta = contas[0]
  return conta ? { nome: conta.name ?? conta.username, upn: conta.username } : null
}

export type LicencaReal = {
  skuId: string
  skuPartNumber: string
  comprados: number
  emUso: number
  livres: number
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
      comprados,
      emUso,
      livres: comprados - emUso,
    }
  })
}

export type UsuarioReal = {
  id: string
  nome: string
  upn: string
  habilitada: boolean
  diasUltimoAcesso: number | null
  totalLicencas: number
}

export async function lerUsuarios(): Promise<UsuarioReal[]> {
  const resposta = await chamarGraph(
    '/users?$select=id,displayName,userPrincipalName,accountEnabled,signInActivity,assignedLicenses&$top=999',
  )
  const dados = await resposta.json()
  const agora = Date.now()
  return (dados.value ?? []).map((u: any) => {
    const ultimo = u.signInActivity ? u.signInActivity.lastSignInDateTime : null
    const dias = ultimo ? Math.floor((agora - new Date(ultimo).getTime()) / 86400000) : null
    return {
      id: u.id,
      nome: u.displayName ?? u.userPrincipalName,
      upn: u.userPrincipalName,
      habilitada: !!u.accountEnabled,
      diasUltimoAcesso: dias,
      totalLicencas: (u.assignedLicenses ?? []).length,
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
