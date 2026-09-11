/**
 * Modelos e mapeamento das respostas da Microsoft Graph.
 *
 * Só funções puras: nada de MSAL, fetch ou React. Assim o mesmo código serve para o
 * console (lib/graph.ts, com o token do usuário logado) e para o envio automático
 * (scripts/envio-automatico.ts, com token de aplicativo rodando no GitHub Actions).
 */

/** Nomes amigaveis para os codigos tecnicos (skuPartNumber) que a Microsoft Graph devolve. */
export const NOMES_LICENCAS: Record<string, string> = {
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

/** Campos de /users que o console pede ($select). */
export const SELECAO_USUARIOS =
  'id,displayName,userPrincipalName,accountEnabled,signInActivity,assignedLicenses,department,userType'

export function mapearLicenca(sku: any): LicencaReal {
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
  provavelCaixaCompartilhada: boolean
}

export function mapearUsuario(u: any, agora: number = Date.now()): UsuarioReal {
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
    provavelCaixaCompartilhada: skuIds.length === 0 && dias === null && u.userType !== 'Guest',
  }
}

export type RegistroMfa = { upn: string; mfaRegistrado: boolean }

export function mapearRegistroMfa(r: any): RegistroMfa {
  return { upn: r.userPrincipalName, mfaRegistrado: !!r.isMfaRegistered }
}
