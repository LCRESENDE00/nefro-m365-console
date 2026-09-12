import { corpoSendMail, type MensagemEmail } from './email'
import {
  mapearLicenca,
  mapearRegistroMfa,
  mapearUsuario,
  SELECAO_USUARIOS,
  type LicencaReal,
  type RegistroMfa,
  type UsuarioReal,
} from './graphModelos'
import { garantirMsalInicializado, msalInstance } from './msalClient'

/** Escopos pedidos de uma vez so, para nao abrir varios popups. */
export const ESCOPOS_REAIS = [
  'Organization.Read.All',
  'User.Read.All',
  'User.ReadWrite.All',
  'AuditLog.Read.All',
  'Reports.Read.All',
]

/**
 * Escopos extras pedidos só quando a acao precisa deles (consentimento incremental):
 * assim o login do dia a dia continua pedindo apenas os ESCOPOS_REAIS, e o popup de
 * consentimento novo aparece uma unica vez, na primeira vez que a funcao e usada.
 */
export const ESCOPOS_GRUPOS = ['GroupMember.ReadWrite.All']
export const ESCOPOS_PAPEIS = ['RoleManagement.ReadWrite.Directory']
export const ESCOPOS_CONVITE = ['User.Invite.All']

async function tokenReal(escoposExtras: string[] = []): Promise<string> {
  await garantirMsalInicializado()
  const scopes = [...ESCOPOS_REAIS, ...escoposExtras]
  const contas = msalInstance.getAllAccounts()
  if (contas.length > 0) {
    try {
      const silencioso = await msalInstance.acquireTokenSilent({
        scopes,
        account: contas[0],
      })
      return silencioso.accessToken
    } catch {
      // token expirou ou faltam escopos: cai para o popup abaixo
    }
    if (escoposExtras.length > 0) {
      const interativo = await msalInstance.acquireTokenPopup({ scopes, account: contas[0] })
      return interativo.accessToken
    }
  }
  const resultado = await msalInstance.loginPopup({ scopes })
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

async function chamarGraph(caminho: string, aceitar?: string, escoposExtras: string[] = []): Promise<Response> {
  const token = await tokenReal(escoposExtras)
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
async function chamarGraphEscrita(
  caminho: string,
  metodo: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  corpo?: unknown,
  escoposExtras: string[] = [],
): Promise<Response> {
  const token = await tokenReal(escoposExtras)
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

// Nomes de licenca, tipos e mapeamento das respostas da Graph ficam em lib/graphModelos.ts
// (sem MSAL), compartilhados com o script de envio automatico. Re-exportados aqui.
export {
  nomeAmigavelLicenca,
  type LicencaReal,
  type RegistroMfa,
  type UsuarioReal,
} from './graphModelos'

export async function lerLicencas(): Promise<LicencaReal[]> {
  const resposta = await chamarGraph('/subscribedSkus')
  const dados = await resposta.json()
  return (dados.value ?? []).map((sku: any) => mapearLicenca(sku))
}

export async function lerUsuarios(): Promise<UsuarioReal[]> {
  const resposta = await chamarGraph('/users?$select=' + SELECAO_USUARIOS + '&$top=999')
  const dados = await resposta.json()
  const agora = Date.now()
  return (dados.value ?? []).map((u: any) => mapearUsuario(u, agora))
}

export async function lerRegistroMfa(): Promise<RegistroMfa[]> {
  const resposta = await chamarGraph('/reports/authenticationMethods/userRegistrationDetails?$top=999')
  const dados = await resposta.json()
  return (dados.value ?? []).map((r: any) => mapearRegistroMfa(r))
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

/** Dados de perfil que o centro de administracao pede em "Informacoes de perfil" (todos opcionais). */
export type PerfilUsuario = {
  primeiroNome?: string
  sobrenome?: string
  cargo?: string
  /** Vai para `department` — na Nefroclinicas e o codigo da unidade (NCBHZ, NCSP...). */
  departamento?: string
  empresa?: string
  escritorio?: string
  telefone?: string
  celular?: string
  endereco?: string
  cidade?: string
  estado?: string
  cep?: string
  pais?: string
}

export type NovoUsuario = PerfilUsuario & {
  nome: string
  upn: string
  senha: string
  /** Obriga a troca de senha no primeiro login (padrao: sim). */
  exigirTrocaSenha?: boolean
  /** Conta nasce habilitada (padrao: sim). */
  habilitada?: boolean
  /** Pais de uso (ISO 3166-1 alpha-2, ex.: BR). Obrigatorio para atribuir licenca. */
  localUso?: string
}

/** Remove chaves vazias para nao gravar "" no Entra. */
function semVazios(objeto: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(objeto).filter(([, valor]) => valor !== undefined && valor !== null && valor !== ''),
  )
}

/** Converte o perfil no formato que a Graph espera (nomes de campo do recurso user). */
function corpoPerfil(perfil: PerfilUsuario): Record<string, unknown> {
  return semVazios({
    givenName: perfil.primeiroNome?.trim(),
    surname: perfil.sobrenome?.trim(),
    jobTitle: perfil.cargo?.trim(),
    department: perfil.departamento?.trim(),
    companyName: perfil.empresa?.trim(),
    officeLocation: perfil.escritorio?.trim(),
    businessPhones: perfil.telefone?.trim() ? [perfil.telefone.trim()] : undefined,
    mobilePhone: perfil.celular?.trim(),
    streetAddress: perfil.endereco?.trim(),
    city: perfil.cidade?.trim(),
    state: perfil.estado?.trim(),
    postalCode: perfil.cep?.trim(),
    country: perfil.pais?.trim(),
  })
}

/** Cria um usuario de verdade no tenant via Microsoft Graph (POST /users). Acao real e irreversivel por aqui. */
export async function criarUsuario(dados: NovoUsuario): Promise<{ id: string }> {
  const apelido = dados.upn.split('@')[0].replace(/[^a-zA-Z0-9.\-_]/g, '')
  const resposta = await chamarGraphEscrita('/users', 'POST', {
    accountEnabled: dados.habilitada ?? true,
    displayName: dados.nome,
    mailNickname: apelido,
    userPrincipalName: dados.upn,
    usageLocation: dados.localUso || undefined,
    passwordProfile: {
      forceChangePasswordNextSignIn: dados.exigirTrocaSenha ?? true,
      password: dados.senha,
    },
    ...corpoPerfil(dados),
  })
  const criado = await resposta.json()
  return { id: criado.id }
}

/** Atualiza campos de perfil de uma conta existente (PATCH /users/{id}). */
export async function atualizarPerfil(id: string, perfil: PerfilUsuario): Promise<void> {
  const corpo = corpoPerfil(perfil)
  if (Object.keys(corpo).length === 0) return
  await chamarGraphEscrita('/users/' + id, 'PATCH', corpo)
}

/**
 * Dados funcionais que a Nefroclinicas guarda no Entra, nos campos "de RH" do usuario:
 * setor -> employeeOrgData.division, CNPJ -> employeeOrgData.costCenter,
 * matricula -> employeeId, vinculo -> employeeType, admissao -> employeeHireDate.
 * (A unidade continua em `department`, que e o campo que alimenta os filtros de regiao.)
 */
export type DadosFuncionais = {
  setor?: string
  cnpj?: string
  matricula?: string
  vinculo?: string
  /** Data no formato YYYY-MM-DD (o input type=date). */
  dataAdmissao?: string
}

/** Grava os dados funcionais (PATCH /users/{id}). Devolve false quando nao havia nada para gravar. */
export async function gravarDadosFuncionais(id: string, dados: DadosFuncionais): Promise<boolean> {
  const setor = dados.setor?.trim()
  const cnpj = dados.cnpj?.trim()
  const corpo = semVazios({
    employeeId: dados.matricula?.trim(),
    employeeType: dados.vinculo?.trim(),
    employeeHireDate: dados.dataAdmissao ? dados.dataAdmissao + 'T00:00:00Z' : undefined,
    // A Graph pede as duas chaves juntas: a que faltar vira null.
    employeeOrgData: setor || cnpj ? { division: setor || null, costCenter: cnpj || null } : undefined,
  })
  if (Object.keys(corpo).length === 0) return false
  await chamarGraphEscrita('/users/' + id, 'PATCH', corpo)
  return true
}

/** Atribui licencas a uma conta (POST /users/{id}/assignLicense). A conta precisa ter usageLocation. */
export async function atribuirLicencas(id: string, skuIds: string[]): Promise<void> {
  if (skuIds.length === 0) return
  await chamarGraphEscrita('/users/' + id + '/assignLicense', 'POST', {
    addLicenses: skuIds.map((skuId) => ({ skuId, disabledPlans: [] })),
    removeLicenses: [],
  })
}

/** Define o gerente da conta (PUT /users/{id}/manager/$ref). */
export async function definirGerente(id: string, gerenteId: string): Promise<void> {
  await chamarGraphEscrita('/users/' + id + '/manager/$ref', 'PUT', {
    '@odata.id': 'https://graph.microsoft.com/v1.0/users/' + gerenteId,
  })
}

/**
 * Atribui uma funcao administrativa (POST /roleManagement/directory/roleAssignments).
 * Exige que quem esta logado seja Administrador global ou de funcoes com privilegios.
 */
export async function atribuirPapel(id: string, roleDefinitionId: string): Promise<void> {
  await chamarGraphEscrita(
    '/roleManagement/directory/roleAssignments',
    'POST',
    {
      '@odata.type': '#microsoft.graph.unifiedRoleAssignment',
      roleDefinitionId,
      principalId: id,
      directoryScopeId: '/',
    },
    ESCOPOS_PAPEIS,
  )
}

export type GrupoReal = {
  id: string
  nome: string
  email: string | null
  /** M365 (Unified) ou de seguranca: da para adicionar membros pela Graph. */
  tipo: 'm365' | 'seguranca' | 'distribuicao' | 'seguranca-email'
  /** Listas de distribuicao e grupos de seguranca com e-mail so mudam pelo Exchange. */
  gerenciavel: boolean
}

/** Lista os grupos do tenant (GET /groups). Pede o escopo de grupos na primeira vez. */
export async function lerGrupos(): Promise<GrupoReal[]> {
  const grupos: GrupoReal[] = []
  let caminho: string | null = '/groups?$select=id,displayName,mail,mailEnabled,securityEnabled,groupTypes&$top=999'
  while (caminho) {
    const resposta: Response = await chamarGraph(caminho, undefined, ESCOPOS_GRUPOS)
    const dados: any = await resposta.json()
    for (const g of dados.value ?? []) {
      const unificado = (g.groupTypes ?? []).includes('Unified')
      const tipo: GrupoReal['tipo'] = unificado
        ? 'm365'
        : g.mailEnabled && g.securityEnabled
          ? 'seguranca-email'
          : g.mailEnabled
            ? 'distribuicao'
            : 'seguranca'
      grupos.push({
        id: g.id,
        nome: g.displayName ?? g.mail ?? g.id,
        email: g.mail ?? null,
        tipo,
        gerenciavel: tipo === 'm365' || tipo === 'seguranca',
      })
    }
    const proximo: string | undefined = dados['@odata.nextLink']
    caminho = proximo ? proximo.replace('https://graph.microsoft.com/v1.0', '') : null
  }
  return grupos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

/** Adiciona a conta como membro de um grupo (POST /groups/{id}/members/$ref). */
export async function adicionarAoGrupo(grupoId: string, usuarioId: string): Promise<void> {
  await chamarGraphEscrita(
    '/groups/' + grupoId + '/members/$ref',
    'POST',
    { '@odata.id': 'https://graph.microsoft.com/v1.0/directoryObjects/' + usuarioId },
    ESCOPOS_GRUPOS,
  )
}

export type NovoConvidado = {
  email: string
  nome: string
  mensagem?: string
  enviarEmail: boolean
}

/** Convida uma pessoa de fora (POST /invitations): cria a conta de convidado (Guest) e manda o e-mail de convite. */
export async function convidarExterno(dados: NovoConvidado): Promise<{ id: string; linkConvite: string }> {
  const resposta = await chamarGraphEscrita(
    '/invitations',
    'POST',
    semVazios({
      invitedUserEmailAddress: dados.email.trim(),
      invitedUserDisplayName: dados.nome.trim() || undefined,
      inviteRedirectUrl: 'https://myapps.microsoft.com',
      sendInvitationMessage: dados.enviarEmail,
      invitedUserMessageInfo: dados.mensagem?.trim()
        ? { customizedMessageBody: dados.mensagem.trim(), messageLanguage: 'pt-BR' }
        : undefined,
    }),
    ESCOPOS_CONVITE,
  )
  const convite = await resposta.json()
  return { id: convite.invitedUser?.id ?? '', linkConvite: convite.inviteRedeemUrl ?? '' }
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

/** O que a assinatura de e-mail usa da conta (GET /users/{id} com $select enxuto). */
export type PerfilAssinatura = {
  nome: string
  cargo: string
  email: string
  celular: string
  telefone: string
  /** Sigla da unidade (campo `department`), para buscar o endereco no catalogo. */
  departamento: string
}

export async function lerPerfilAssinatura(id: string): Promise<PerfilAssinatura> {
  const resposta = await chamarGraph(
    '/users/' + encodeURIComponent(id) + '?$select=displayName,jobTitle,mail,userPrincipalName,mobilePhone,businessPhones,department',
  )
  const u = await resposta.json()
  return {
    nome: u.displayName ?? '',
    cargo: u.jobTitle ?? '',
    email: u.mail ?? u.userPrincipalName ?? '',
    celular: u.mobilePhone ?? '',
    telefone: Array.isArray(u.businessPhones) && u.businessPhones.length > 0 ? String(u.businessPhones[0]) : '',
    departamento: u.department ?? '',
  }
}

/** Escopo pedido so na hora de enviar e-mail (consentimento incremental). */
export const ESCOPOS_EMAIL = ['Mail.Send']

/**
 * Envia um e-mail pela caixa de quem esta logado (POST /me/sendMail).
 * Na primeira vez a Microsoft pede o consentimento de Mail.Send em um popup.
 */
export async function enviarEmail(mensagem: MensagemEmail): Promise<void> {
  await chamarGraphEscrita('/me/sendMail', 'POST', corpoSendMail(mensagem), ESCOPOS_EMAIL)
}
