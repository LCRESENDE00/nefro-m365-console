/**
 * Modo demo: dados ficticios, nenhuma chamada a Microsoft Graph.
 *
 * O caminho normal do console continua sendo o login com a Microsoft (dados reais do
 * tenant). O modo demo existe para abrir o console sem app registration, sem permissao
 * de administrador e sem internet - serve para mostrar as telas, conferir layout e
 * rodar em maquina nova. Nada aqui existe no tenant: nomes, unidades, datas e numeros
 * sao inventados, e o dominio `nefroclinicas.exemplo` nao e o da clinica.
 *
 * Como se liga no resto: a sessao guarda `modo: 'demo'` (features/login/sessao.tsx) e
 * lib/dadosReais.tsx chama `ehSessaoDemo()` antes de conectar - quando e demo, enche o
 * estado com `estadoDemo()` e nunca toca na Graph. Toda acao de escrita (criar conta,
 * redefinir senha, ativar/desativar, remover licenca) para com `ERRO_DEMO`.
 */
import { nomeAmigavelLicenca, type LicencaReal, type RegistroMfa, type UsuarioReal } from './graphModelos'

/** Mesmo formato de ContaArmazenamento (lib/graph.ts), repetido aqui para o demo nao importar MSAL. */
type ArmazenamentoDemo = { upn: string; nome: string; gb: number }

/** Igual a constante CHAVE de features/login/sessao.tsx - se mudar la, mudar aqui. */
const CHAVE_SESSAO = 'console-m365:sessao'

const DOMINIO_FICTICIO = 'nefroclinicas.exemplo'

/**
 * skuId: os GUIDs publicos de catalogo da Microsoft, e skuPartNumber igual ao que a
 * Graph devolve - assim os nomes (graphModelos.ts) e os precos por licenca
 * (precosPadrao.ts) batem com os das telas com dados reais.
 */
const CATALOGO_DEMO = {
  basic: { skuId: '3b555118-da6a-4418-894f-7df1e2096870', skuPartNumber: 'O365_BUSINESS_ESSENTIALS', comprados: 36 },
  standard: { skuId: 'f245ecc8-75af-4f8e-b61f-27d8114de5f3', skuPartNumber: 'O365_BUSINESS_PREMIUM', comprados: 14 },
  powerbi: { skuId: 'a403ebcc-fae0-4ca2-8c8c-7a907fd6c235', skuPartNumber: 'POWER_BI_STANDARD', comprados: 10000 },
} as const

type PlanoDemo = keyof typeof CATALOGO_DEMO | 'nenhum'

type PessoaDemo = {
  nome: string
  /** Codigo da unidade como vem no campo `department` do Entra. */
  unidade: string
  /** Dias desde o ultimo acesso; null = nunca acessou. */
  dias: number | null
  plano: PlanoDemo
  /** Conta de fora do tenant (userType Guest no Entra). */
  externo?: boolean
  /** Nao registrou nenhum metodo de MFA. */
  semMfa?: boolean
  /** GB ocupados no OneDrive. */
  gb?: number
}

const PESSOAS_DEMO: PessoaDemo[] = [
  { nome: 'Ana Beatriz Moraes', unidade: 'NCBHZ', dias: 0, plano: 'standard', gb: 18.4 },
  { nome: 'Rafael Coutinho Lima', unidade: 'NCBHZ', dias: 1, plano: 'standard', gb: 26.1 },
  { nome: 'Juliana Prado Ferreira', unidade: 'NCBHZ', dias: 2, plano: 'basic', gb: 7.2 },
  { nome: 'Marcos Vinicius Alves', unidade: 'NCBHZ', dias: 3, plano: 'basic', gb: 4.8 },
  { nome: 'Carla Rezende Duarte', unidade: 'NCBHZ', dias: 5, plano: 'standard', gb: 31.9 },
  { nome: 'Thiago Nogueira Pinto', unidade: 'NCBHZ', dias: 41, plano: 'basic', gb: 2.3, semMfa: true },
  { nome: 'Patricia Alencar Souza', unidade: 'NCBHZ', dias: 168, plano: 'basic', gb: 1.1, semMfa: true },
  { nome: 'Recepcao Belo Horizonte', unidade: 'NCBHZ', dias: null, plano: 'nenhum', semMfa: true },
  { nome: 'Eduardo Salles Campos', unidade: 'NCGVA', dias: 1, plano: 'basic', gb: 6.6 },
  { nome: 'Fernanda Quintao Reis', unidade: 'NCGVA', dias: 4, plano: 'basic', gb: 9.4 },
  { nome: 'Luana Teixeira Braga', unidade: 'NCGVA', dias: 57, plano: 'basic', gb: 3.0, semMfa: true },
  { nome: 'Gustavo Peixoto Andrade', unidade: 'NCIPA', dias: 2, plano: 'standard', gb: 14.7 },
  { nome: 'Simone Barcelos Mota', unidade: 'NCIPA', dias: 8, plano: 'basic', gb: 5.2 },
  { nome: 'Wesley Aparecido Rocha', unidade: 'NCIPA', dias: 213, plano: 'basic', gb: 0.6, semMfa: true },
  { nome: 'Bruna Carvalho Menezes', unidade: 'NCBSB', dias: 0, plano: 'standard', gb: 22.8 },
  { nome: 'Daniel Furtado Ribeiro', unidade: 'NCBSB', dias: 1, plano: 'basic', gb: 11.3 },
  { nome: 'Tatiane Miranda Lopes', unidade: 'NCBSB', dias: 6, plano: 'basic', gb: 8.9 },
  { nome: 'Alexandre Bastos Freitas', unidade: 'NCBSB', dias: 36, plano: 'standard', gb: 4.1 },
  { nome: 'Helena Marques Vilela', unidade: 'NCBSB', dias: 124, plano: 'basic', gb: 1.9, semMfa: true },
  { nome: 'Caixa Faturamento Brasilia', unidade: 'NCBSB', dias: null, plano: 'nenhum', semMfa: true },
  { nome: 'Rodrigo Tavares Pimenta', unidade: 'NCBSB2', dias: 3, plano: 'basic', gb: 6.0 },
  { nome: 'Viviane Castro Amaral', unidade: 'NCBSB2', dias: 72, plano: 'basic', gb: 2.7, semMfa: true },
  { nome: 'Leonardo Assis Batista', unidade: 'NCSP', dias: 0, plano: 'standard', gb: 39.5 },
  { nome: 'Camila Fontoura Serra', unidade: 'NCSP', dias: 1, plano: 'standard', gb: 17.2 },
  { nome: 'Pedro Henrique Galvao', unidade: 'NCSP', dias: 2, plano: 'basic', gb: 10.4 },
  { nome: 'Isabela Nunes Cardoso', unidade: 'NCSP', dias: 9, plano: 'basic', gb: 7.8 },
  { nome: 'Otavio Lemos Pacheco', unidade: 'NCSP', dias: 48, plano: 'basic', gb: 3.4, semMfa: true },
  { nome: 'Sandra Regina Vasques', unidade: 'NCSP', dias: 301, plano: 'standard', gb: 1.2, semMfa: true },
  { nome: 'Recepcao Sao Paulo', unidade: 'NCSP', dias: null, plano: 'nenhum', semMfa: true },
  { nome: 'Vinicius Aragao Pontes', unidade: 'NCNIT', dias: 4, plano: 'basic', gb: 5.9 },
  { nome: 'Larissa Moreno Britto', unidade: 'NCNIT', dias: 13, plano: 'basic', gb: 12.6 },
  { nome: 'Cesar Augusto Villela', unidade: 'NCNIT', dias: 156, plano: 'basic', gb: 0.9, semMfa: true },
  { nome: 'Monica Estevao Lins', unidade: 'NCVRD', dias: 2, plano: 'basic', gb: 8.1 },
  { nome: 'Fabio Junqueira Neves', unidade: 'NCVRD', dias: 65, plano: 'basic', gb: 2.2, semMfa: true },
  { nome: 'Renata Bicalho Correia', unidade: 'NCCWB', dias: 1, plano: 'standard', gb: 20.3 },
  { nome: 'Joao Vitor Schmidt', unidade: 'NCCWB', dias: 7, plano: 'basic', gb: 9.8 },
  { nome: 'Priscila Hauck Ferraz', unidade: 'NCCWB', dias: 39, plano: 'basic', gb: 4.5 },
  { nome: 'Antonio Sergio Krause', unidade: 'NCCWB', dias: 188, plano: 'basic', gb: 1.4, semMfa: true },
  { nome: 'Mariana Bezerra Coelho', unidade: 'NCREC', dias: 0, plano: 'standard', gb: 15.0 },
  { nome: 'Igor Cavalcanti Pires', unidade: 'NCREC', dias: 5, plano: 'basic', gb: 6.3 },
  { nome: 'Adriana Melo Sarmento', unidade: 'NCREC', dias: 44, plano: 'basic', gb: 3.7, semMfa: true },
  { nome: 'Caixa Compras Recife', unidade: 'NCREC', dias: null, plano: 'nenhum', semMfa: true },
  { nome: 'Emanuel Costa Ribamar', unidade: 'NCSLZ', dias: 3, plano: 'basic', gb: 7.5 },
  { nome: 'Kelly Damasceno Aguiar', unidade: 'NCSLZ', dias: 21, plano: 'basic', gb: 5.1 },
  { nome: 'Nivaldo Pereira Sampaio', unidade: 'NCSLZ', dias: 244, plano: 'basic', gb: 0.8, semMfa: true },
  { nome: 'Auditoria Externa Contabil', unidade: '', dias: 12, plano: 'nenhum', externo: true, semMfa: true },
  { nome: 'Consultoria LGPD Parceira', unidade: '', dias: 96, plano: 'nenhum', externo: true, semMfa: true },
]

/** joao.silva@nefroclinicas.exemplo a partir do nome, sem acento e sem espaco. */
function upnFicticio(nome: string): string {
  const partes = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
  const primeiro = partes[0] ?? 'conta'
  const ultimo = partes.length > 1 ? partes[partes.length - 1] : ''
  return (ultimo ? primeiro + '.' + ultimo : primeiro) + '@' + DOMINIO_FICTICIO
}

function montarUsuarios(agora: number): UsuarioReal[] {
  return PESSOAS_DEMO.map((pessoa, indice) => {
    const skuIds = pessoa.plano === 'nenhum' ? [] : [CATALOGO_DEMO[pessoa.plano].skuId]
    const ultimoAcessoIso = pessoa.dias === null ? null : new Date(agora - pessoa.dias * 86400000).toISOString()
    return {
      id: 'demo-' + String(indice + 1).padStart(3, '0'),
      nome: pessoa.nome,
      upn: upnFicticio(pessoa.nome),
      habilitada: pessoa.dias === null ? true : pessoa.dias < 365,
      diasUltimoAcesso: pessoa.dias,
      ultimoAcessoIso,
      skuIds,
      totalLicencas: skuIds.length,
      departamento: pessoa.unidade || null,
      externo: !!pessoa.externo,
      provavelCaixaCompartilhada: skuIds.length === 0 && pessoa.dias === null && !pessoa.externo,
    }
  })
}

function montarLicencas(usuarios: UsuarioReal[]): LicencaReal[] {
  return Object.values(CATALOGO_DEMO).map((sku) => {
    const emUso = usuarios.filter((u) => u.skuIds.includes(sku.skuId)).length
    return {
      skuId: sku.skuId,
      skuPartNumber: sku.skuPartNumber,
      nome: nomeAmigavelLicenca(sku.skuPartNumber),
      comprados: sku.comprados,
      emUso,
      livres: sku.comprados - emUso,
      provavelAutosservico: sku.comprados >= 5000,
    }
  })
}

/** Le a sessao salva e diz se o console esta no modo demo. */
export function ehSessaoDemo(): boolean {
  try {
    const bruto = localStorage.getItem(CHAVE_SESSAO)
    if (!bruto) return false
    return (JSON.parse(bruto) as { modo?: string } | null)?.modo === 'demo'
  } catch {
    return false
  }
}

export const ERRO_DEMO =
  'Modo demo: esta acao gravaria no tenant, entao fica desativada. Entre com a Microsoft para usa-la.'

export const NOME_SESSAO_DEMO = 'Modo demo'

/** Estado completo que lib/dadosReais.tsx usa no lugar das leituras da Graph. */
export function estadoDemo() {
  const agora = Date.now()
  const usuarios = montarUsuarios(agora)
  const licencas = montarLicencas(usuarios)
  const mfa: RegistroMfa[] = PESSOAS_DEMO.map((pessoa) => ({
    upn: upnFicticio(pessoa.nome),
    mfaRegistrado: !pessoa.semMfa,
  }))
  const armazenamento: ArmazenamentoDemo[] = PESSOAS_DEMO.filter((pessoa) => pessoa.gb !== undefined).map((pessoa) => ({
    upn: upnFicticio(pessoa.nome),
    nome: pessoa.nome,
    gb: pessoa.gb as number,
  }))

  return { nome: NOME_SESSAO_DEMO, licencas, usuarios, mfa, armazenamento }
}
