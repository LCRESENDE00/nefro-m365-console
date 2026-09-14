import { useSyncExternalStore } from 'react'

/**
 * Organograma — quem reporta a quem, a partir da planilha "Organograma Empresarial"
 * (a planilha da Bruna, exportada em CSV).
 *
 * A planilha é importada no navegador e fica salva só nele (localStorage), como o tema
 * e os catálogos: nada vai para o repositório nem para servidor nenhum. Na importação
 * entram apenas as colunas que a tela usa (nome, cargo, e-mail, gestor, setor, unidade,
 * regional); CPF e as demais colunas são descartados na hora e nunca são gravados.
 */

export type Colaborador = {
  /** Chave única: login do e-mail (antes do @) ou, sem e-mail, o nome normalizado. */
  id: string
  nome: string
  cargo: string
  /** E-mail completo (login + domínio) ou '' quando a planilha não tem. */
  email: string
  setor: string
  unidade: string
  regional: string
  /** Id do gestor imediato, ou null quando é o topo da hierarquia (ou não tem gestor na planilha). */
  gestorId: string | null
  /** Coluna "gestores operacionais?" da planilha. */
  gestorOperacional: boolean
  /**
   * false quando a pessoa só aparece como gestor de alguém, sem linha própria na planilha
   * (ex.: diretoria que não está cadastrada como colaborador).
   */
  naPlanilha: boolean
}

export type Organograma = {
  /** Nome do arquivo importado, para a pessoa saber qual versão está carregada. */
  arquivo: string
  /** Quando foi importado (ISO). */
  importadoEm: string
  colaboradores: Colaborador[]
}

export const CHAVE_ORGANOGRAMA = 'nefrocontrol:organograma'

const DOMINIO_PADRAO = '@nefroclinicas.com.br'

/** Colunas da planilha que a tela usa; qualquer outra (CPF inclusive) é ignorada. */
const COLUNAS = {
  nome: ['nome', 'colaborador', 'funcionario'],
  cargo: ['cargo', 'funcao'],
  email: ['email', 'e-mail', 'login'],
  gestor: ['gestor_imediato', 'gestor imediato', 'gestor', 'lider'],
  emailGestor: ['email_gestor', 'email gestor', 'e-mail gestor'],
  setor: ['setor', 'departamento', 'area'],
  unidade: ['unidade'],
  regional: ['regional', 'regiao'],
  dominio: ['@', 'dominio'],
  gestorOperacional: ['gestores operacionais?', 'gestor operacional', 'gestores operacionais'],
} as const

type Coluna = keyof typeof COLUNAS

/** Maiúsculas, sem acentos e com um espaço só entre as palavras: "LUÍS  Márcio" → "LUIS MARCIO". */
export const normalizarNome = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()

const normalizarCabecalho = (texto: string) => normalizarNome(texto).toLowerCase().replace(/^﻿/, '')

/** Célula vazia, "null", "-" ou só espaços vira ''. */
function limpar(valor: string | undefined): string {
  const texto = (valor ?? '').trim()
  if (!texto) return ''
  const baixo = texto.toLowerCase()
  if (baixo === 'null' || baixo === 'undefined' || baixo === '-' || baixo === 'n/a') return ''
  return texto
}

/** Login do e-mail ("fernando.lucas" de "fernando.lucas@nefroclinicas.com.br"), em minúsculas. */
const loginDoEmail = (email: string) => email.trim().toLowerCase().split('@')[0].trim()

/** Divide uma linha de CSV respeitando aspas ("a;b" fica inteiro). */
function dividirLinha(linha: string, separador: string): string[] {
  const celulas: string[] = []
  let atual = ''
  let entreAspas = false
  for (let i = 0; i < linha.length; i++) {
    const caractere = linha[i]
    if (entreAspas) {
      if (caractere === '"') {
        if (linha[i + 1] === '"') {
          atual += '"'
          i++
        } else {
          entreAspas = false
        }
      } else {
        atual += caractere
      }
    } else if (caractere === '"') {
      entreAspas = true
    } else if (caractere === separador) {
      celulas.push(atual)
      atual = ''
    } else {
      atual += caractere
    }
  }
  celulas.push(atual)
  return celulas
}

/** Quebra o texto em registros, tratando quebras de linha dentro de aspas. */
function dividirRegistros(texto: string): string[] {
  const registros: string[] = []
  let atual = ''
  let entreAspas = false
  for (let i = 0; i < texto.length; i++) {
    const caractere = texto[i]
    if (caractere === '"') entreAspas = !entreAspas
    if (!entreAspas && (caractere === '\n' || caractere === '\r')) {
      if (caractere === '\r' && texto[i + 1] === '\n') i++
      registros.push(atual)
      atual = ''
    } else {
      atual += caractere
    }
  }
  if (atual) registros.push(atual)
  return registros
}

/** Separador mais frequente no cabeçalho: a planilha da Bruna usa ';', o Excel em inglês usa ','. */
function detectarSeparador(cabecalho: string): string {
  const candidatos = [';', ',', '\t']
  let melhor = ';'
  let maior = -1
  for (const separador of candidatos) {
    const total = dividirLinha(cabecalho, separador).length
    if (total > maior) {
      maior = total
      melhor = separador
    }
  }
  return melhor
}

export type ResultadoImportacao = {
  colaboradores: Colaborador[]
  /** Linhas puladas por não terem nome. */
  ignoradas: number
}

/**
 * Lê o CSV da planilha e monta a lista de colaboradores já com o gestor resolvido.
 * Lança erro com mensagem amigável quando o arquivo não tem as colunas mínimas.
 */
export function importarCsvOrganograma(texto: string): ResultadoImportacao {
  const registros = dividirRegistros(texto.replace(/^﻿/, '')).filter((linha) => linha.trim())
  if (registros.length < 2) throw new Error('O arquivo está vazio ou só tem o cabeçalho.')

  const separador = detectarSeparador(registros[0])
  const cabecalho = dividirLinha(registros[0], separador).map(normalizarCabecalho)

  const indice: Partial<Record<Coluna, number>> = {}
  for (const coluna of Object.keys(COLUNAS) as Coluna[]) {
    const posicao = cabecalho.findIndex((titulo) => (COLUNAS[coluna] as readonly string[]).includes(titulo))
    if (posicao >= 0) indice[coluna] = posicao
  }
  if (indice.nome === undefined || indice.gestor === undefined) {
    throw new Error('A planilha precisa ter as colunas "nome" e "gestor_imediato" (como na planilha do organograma).')
  }

  const ler = (celulas: string[], coluna: Coluna) => {
    const posicao = indice[coluna]
    return posicao === undefined ? '' : limpar(celulas[posicao])
  }

  type Bruto = {
    nome: string
    cargo: string
    login: string
    email: string
    setor: string
    unidade: string
    regional: string
    gestorNome: string
    gestorLogin: string
    gestorOperacional: boolean
  }

  const brutos: Bruto[] = []
  let ignoradas = 0
  for (const registro of registros.slice(1)) {
    const celulas = dividirLinha(registro, separador)
    const nome = ler(celulas, 'nome')
    if (!nome) {
      ignoradas++
      continue
    }
    const dominioPlanilha = ler(celulas, 'dominio')
    const dominio = dominioPlanilha ? (dominioPlanilha.startsWith('@') ? dominioPlanilha : '@' + dominioPlanilha) : DOMINIO_PADRAO
    const emailBruto = ler(celulas, 'email')
    const login = emailBruto ? loginDoEmail(emailBruto) : ''
    const gestorEmailBruto = ler(celulas, 'emailGestor')
    const gestorLogin = gestorEmailBruto ? loginDoEmail(gestorEmailBruto) : ''
    brutos.push({
      nome,
      cargo: ler(celulas, 'cargo'),
      login,
      email: login ? (emailBruto.includes('@') ? emailBruto.trim().toLowerCase() : login + dominio.toLowerCase()) : '',
      setor: ler(celulas, 'setor'),
      unidade: ler(celulas, 'unidade').toUpperCase(),
      regional: ler(celulas, 'regional').toUpperCase(),
      gestorNome: ler(celulas, 'gestor'),
      gestorLogin,
      gestorOperacional: ler(celulas, 'gestorOperacional').toLowerCase().startsWith('s'),
    })
  }

  // Índices para achar o gestor: pelo login do e-mail (mais confiável — a mesma pessoa aparece
  // como "DINE HELEN ALVARENGA" e "DINE HELEN DE ALVARENGA", mas o login é um só) e, sem
  // e-mail, pelo nome normalizado.
  const porLogin = new Map<string, string>()
  const porNome = new Map<string, string>()
  const idsUsados = new Set<string>()
  const colaboradores: Colaborador[] = []

  const idUnico = (base: string) => {
    let id = base
    let n = 2
    while (idsUsados.has(id)) id = `${base}#${n++}`
    idsUsados.add(id)
    return id
  }

  for (const bruto of brutos) {
    const chaveNome = normalizarNome(bruto.nome)
    const id = idUnico(bruto.login || chaveNome)
    if (bruto.login && !porLogin.has(bruto.login)) porLogin.set(bruto.login, id)
    if (!porNome.has(chaveNome)) porNome.set(chaveNome, id)
    colaboradores.push({
      id,
      nome: bruto.nome,
      cargo: bruto.cargo,
      email: bruto.email,
      setor: bruto.setor,
      unidade: bruto.unidade,
      regional: bruto.regional,
      gestorId: null,
      gestorOperacional: bruto.gestorOperacional,
      naPlanilha: true,
    })
  }

  // Segunda passada: resolve o gestor de cada linha. Gestor que não tem linha própria vira um
  // nó "fora da planilha", para a equipe dele continuar aparecendo.
  const virtuais = new Map<string, Colaborador>()
  brutos.forEach((bruto, posicao) => {
    const nomeGestor = bruto.gestorNome
    const loginGestor = bruto.gestorLogin
    if (!nomeGestor && !loginGestor) return

    // Alguém que só aparece como gestor às vezes vem com o login no lugar do nome ("tuanne.lopes").
    const chaveNomeGestor = normalizarNome(nomeGestor || loginGestor)
    let gestorId = (loginGestor && porLogin.get(loginGestor)) || porNome.get(chaveNomeGestor) || null

    if (!gestorId) {
      const chaveVirtual = loginGestor || chaveNomeGestor
      let virtual = virtuais.get(chaveVirtual)
      if (!virtual) {
        virtual = {
          id: idUnico(chaveVirtual),
          nome: nomeGestor && !nomeGestor.includes('.') ? nomeGestor : loginGestor.replace(/\./g, ' ').toUpperCase(),
          cargo: '',
          email: loginGestor ? loginGestor + DOMINIO_PADRAO : '',
          setor: '',
          unidade: '',
          regional: '',
          gestorId: null,
          gestorOperacional: false,
          naPlanilha: false,
        }
        virtuais.set(chaveVirtual, virtual)
        if (loginGestor) porLogin.set(loginGestor, virtual.id)
        porNome.set(chaveNomeGestor, virtual.id)
      }
      gestorId = virtual.id
    }

    const proprio = colaboradores[posicao]
    // Ninguém é gestor de si mesmo (linha com o próprio nome no gestor_imediato).
    proprio.gestorId = gestorId === proprio.id ? null : gestorId
  })

  return { colaboradores: [...colaboradores, ...virtuais.values()], ignoradas }
}

/* ---------- armazenamento (localStorage, como tema e catálogos) ---------- */

function lerSalvo(): Organograma | null {
  try {
    const bruto = localStorage.getItem(CHAVE_ORGANOGRAMA)
    if (!bruto) return null
    const salvo = JSON.parse(bruto) as Partial<Organograma>
    if (!Array.isArray(salvo.colaboradores)) return null
    return {
      arquivo: String(salvo.arquivo ?? ''),
      importadoEm: String(salvo.importadoEm ?? ''),
      colaboradores: salvo.colaboradores.filter((c) => c && typeof c.id === 'string' && typeof c.nome === 'string'),
    }
  } catch {
    return null
  }
}

let organogramaAtual: Organograma | null = lerSalvo()
const ouvintes = new Set<() => void>()

function notificar() {
  ouvintes.forEach((ouvinte) => ouvinte())
}

export function definirOrganograma(organograma: Organograma | null) {
  organogramaAtual = organograma
  try {
    if (organograma) localStorage.setItem(CHAVE_ORGANOGRAMA, JSON.stringify(organograma))
    else localStorage.removeItem(CHAVE_ORGANOGRAMA)
  } catch {
    // Sem localStorage o organograma vale só até recarregar a página.
  }
  notificar()
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte)
  return () => ouvintes.delete(ouvinte)
}

export function useOrganograma() {
  const organograma = useSyncExternalStore(assinar, () => organogramaAtual, () => null)
  return { organograma, definirOrganograma, limparOrganograma: () => definirOrganograma(null) }
}

/* ---------- hierarquia ---------- */

export type Hierarquia = {
  porId: Map<string, Colaborador>
  /** Subordinados diretos de cada gestor. */
  diretos: Map<string, Colaborador[]>
  /** Tamanho da equipe inteira (diretos + indiretos) de cada gestor. */
  equipeTotal: Map<string, number>
  /** Quem tem pelo menos um subordinado. */
  gestores: Colaborador[]
}

const ordenarPorNome = (a: Colaborador, b: Colaborador) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })

export function montarHierarquia(colaboradores: Colaborador[]): Hierarquia {
  const porId = new Map(colaboradores.map((c) => [c.id, c]))
  const diretos = new Map<string, Colaborador[]>()
  for (const colaborador of colaboradores) {
    if (!colaborador.gestorId || !porId.has(colaborador.gestorId)) continue
    const lista = diretos.get(colaborador.gestorId) ?? []
    lista.push(colaborador)
    diretos.set(colaborador.gestorId, lista)
  }
  diretos.forEach((lista) => lista.sort(ordenarPorNome))

  const equipeTotal = new Map<string, number>()
  const contar = (id: string, visitados: Set<string>): number => {
    const memo = equipeTotal.get(id)
    if (memo !== undefined) return memo
    if (visitados.has(id)) return 0 // ciclo na planilha (A gestor de B, B gestor de A)
    visitados.add(id)
    let total = 0
    for (const sub of diretos.get(id) ?? []) total += 1 + contar(sub.id, visitados)
    equipeTotal.set(id, total)
    return total
  }
  for (const id of diretos.keys()) contar(id, new Set())

  const gestores = [...diretos.keys()]
    .map((id) => porId.get(id)!)
    .sort((a, b) => (equipeTotal.get(b.id) ?? 0) - (equipeTotal.get(a.id) ?? 0) || ordenarPorNome(a, b))

  return { porId, diretos, equipeTotal, gestores }
}

/** Cadeia de gestores acima de alguém, do chefe imediato até o topo. */
export function cadeiaDeGestores(id: string, hierarquia: Hierarquia): Colaborador[] {
  const cadeia: Colaborador[] = []
  const visitados = new Set<string>([id])
  let atual = hierarquia.porId.get(id)?.gestorId ?? null
  while (atual && !visitados.has(atual)) {
    const gestor = hierarquia.porId.get(atual)
    if (!gestor) break
    cadeia.push(gestor)
    visitados.add(atual)
    atual = gestor.gestorId
  }
  return cadeia
}

/** Toda a equipe abaixo de alguém (diretos e indiretos), sem repetir ninguém. */
export function equipeCompleta(id: string, hierarquia: Hierarquia): Colaborador[] {
  const resultado: Colaborador[] = []
  const visitados = new Set<string>([id])
  const fila = [...(hierarquia.diretos.get(id) ?? [])]
  while (fila.length) {
    const pessoa = fila.shift()!
    if (visitados.has(pessoa.id)) continue
    visitados.add(pessoa.id)
    resultado.push(pessoa)
    fila.push(...(hierarquia.diretos.get(pessoa.id) ?? []))
  }
  return resultado.sort(ordenarPorNome)
}
