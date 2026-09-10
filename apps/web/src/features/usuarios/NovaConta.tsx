import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Carregando, Erro } from '../../components/Estado'
import { useToast } from '../../components/Toast'
import { useSubtitulo } from '../../layout/pagina'
import { descreverUnidade, useCatalogos } from '../../lib/catalogos'
import { useDadosReais } from '../../lib/dadosReais'
import { nomeTitulo } from '../../lib/formato'
import {
  adicionarAoGrupo,
  atribuirLicencas,
  atribuirPapel,
  atualizarPerfil,
  convidarExterno,
  criarUsuario,
  definirGerente,
  gerarSenhaTemporaria,
  gravarDadosFuncionais,
  lerGrupos,
  type DadosFuncionais,
  type GrupoReal,
  type PerfilUsuario,
} from '../../lib/graph'
import { CATEGORIAS_PAPEIS, PAPEIS_ADMIN, papelPorId } from '../../lib/papeis'
import estilos from './NovaConta.module.css'

/* ------------------------------------------------------------------ */
/* Etapas do assistente — a mesma sequência do centro de administração  */
/* ------------------------------------------------------------------ */

const ETAPAS = [
  { rotulo: 'Dados básicos', descricao: 'Nome, e-mail e senha' },
  { rotulo: 'Licenças', descricao: 'Local de uso e produtos' },
  { rotulo: 'Configurações opcionais', descricao: 'Funções, dados, gestor e grupos' },
  { rotulo: 'Revisar e concluir', descricao: 'Confira tudo antes de gravar' },
] as const

type Etapa = 0 | 1 | 2 | 3

/** Países mais prováveis para o "local de uso" (obrigatório para licença). Código ISO 3166-1. */
const PAISES: Array<[string, string]> = [
  ['BR', 'Brasil'],
  ['PT', 'Portugal'],
  ['US', 'Estados Unidos'],
  ['AR', 'Argentina'],
  ['CL', 'Chile'],
  ['CO', 'Colômbia'],
  ['MX', 'México'],
  ['PY', 'Paraguai'],
  ['UY', 'Uruguai'],
  ['PE', 'Peru'],
  ['BO', 'Bolívia'],
  ['ES', 'Espanha'],
  ['IT', 'Itália'],
  ['FR', 'França'],
  ['DE', 'Alemanha'],
  ['GB', 'Reino Unido'],
  ['CA', 'Canadá'],
  ['AO', 'Angola'],
  ['MZ', 'Moçambique'],
  ['JP', 'Japão'],
]

const nomePais = (codigo: string) => PAISES.find(([c]) => c === codigo)?.[1] ?? codigo

/** Tipos de vínculo mais comuns; o campo aceita qualquer texto (vai para employeeType). */
const VINCULOS = ['CLT', 'PJ', 'Estagiário', 'Terceirizado', 'Temporário', 'Residente', 'Sócio / diretoria']

/** Formata o CNPJ enquanto digita: 00.000.000/0000-00. */
function formatarCnpj(texto: string): string {
  const digitos = texto.replace(/\D/g, '').slice(0, 14)
  return digitos
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5')
}

const dataBr = (iso: string) => {
  const [ano, mes, dia] = iso.split('-')
  return dia && mes && ano ? `${dia}/${mes}/${ano}` : iso
}

type TipoConta = 'interno' | 'convidado'

type Formulario = {
  tipo: TipoConta
  // --- dados básicos (usuário interno) ---
  primeiroNome: string
  sobrenome: string
  nomeExibicao: string
  nomeExibicaoManual: boolean
  usuario: string
  usuarioManual: boolean
  dominio: string
  modoSenha: 'automatica' | 'manual'
  senhaManual: string
  mostrarSenha: boolean
  exigirTroca: boolean
  habilitada: boolean
  // --- dados básicos (convidado externo) ---
  emailConvidado: string
  mensagemConvite: string
  enviarConvite: boolean
  // --- licenças ---
  modoLicenca: 'atribuir' | 'sem'
  localUso: string
  skuIds: string[]
  // --- configurações opcionais ---
  acessoAdmin: boolean
  papeis: string[]
  cargo: string
  departamento: string
  setor: string
  cnpj: string
  matricula: string
  vinculo: string
  dataAdmissao: string
  empresa: string
  escritorio: string
  telefone: string
  celular: string
  endereco: string
  cidade: string
  estado: string
  cep: string
  pais: string
  gerenteId: string
  grupos: string[]
}

const FORMULARIO_INICIAL: Formulario = {
  tipo: 'interno',
  primeiroNome: '',
  sobrenome: '',
  nomeExibicao: '',
  nomeExibicaoManual: false,
  usuario: '',
  usuarioManual: false,
  dominio: '',
  modoSenha: 'automatica',
  senhaManual: '',
  mostrarSenha: false,
  exigirTroca: true,
  habilitada: true,
  emailConvidado: '',
  mensagemConvite: '',
  enviarConvite: true,
  modoLicenca: 'atribuir',
  localUso: 'BR',
  skuIds: [],
  acessoAdmin: false,
  papeis: [],
  cargo: '',
  departamento: '',
  setor: '',
  cnpj: '',
  matricula: '',
  vinculo: '',
  dataAdmissao: '',
  empresa: 'Nefroclínicas',
  escritorio: '',
  telefone: '',
  celular: '',
  endereco: '',
  cidade: '',
  estado: '',
  cep: '',
  pais: 'Brasil',
  gerenteId: '',
  grupos: [],
}

/* ------------------------------------------------------------------ */
/* Ajudantes de texto e validação                                       */
/* ------------------------------------------------------------------ */

const PREPOSICOES = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])

/** Tira acentos e deixa só o que o Entra aceita no nome de usuário. */
const normalizarUsuario = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '')

/** Sugestão no padrão da casa: primeiro nome + último sobrenome (ex.: maria.souza). */
function sugerirUsuario(primeiroNome: string, sobrenome: string): string {
  const primeiro = primeiroNome.trim().split(/\s+/)[0] ?? ''
  const partes = sobrenome
    .trim()
    .split(/\s+/)
    .filter((parte) => parte && !PREPOSICOES.has(parte.toLowerCase()))
  const ultimo = partes[partes.length - 1] ?? ''
  return [normalizarUsuario(primeiro), normalizarUsuario(ultimo)].filter(Boolean).join('.')
}

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Regras de senha do Microsoft 365: 8 a 256 caracteres com 3 dos 4 tipos. */
function problemaSenha(senha: string): string | null {
  if (senha.length < 8) return 'Use pelo menos 8 caracteres.'
  if (senha.length > 256) return 'No máximo 256 caracteres.'
  const tipos = [/[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((regra) => regra.test(senha)).length
  if (tipos < 3) return 'Combine pelo menos 3 tipos: maiúsculas, minúsculas, números e símbolos.'
  return null
}

/** UPN que o Entra gera para um convidado: e-mail com "_" no lugar do "@" + #EXT#. */
const prefixoConvidado = (email: string) => email.trim().toLowerCase().replace('@', '_') + '#ext#'

/** Espera um pouco e tenta de novo quando a Graph ainda não replicou a conta recém-criada. */
async function comRepeticao<T>(acao: () => Promise<T>, tentativas = 3): Promise<T> {
  let ultimaFalha: unknown
  for (let tentativa = 0; tentativa < tentativas; tentativa++) {
    try {
      return await acao()
    } catch (falha) {
      ultimaFalha = falha
      const mensagem = String((falha as Error)?.message ?? falha).toLowerCase()
      const transitorio = mensagem.includes('404') || mensagem.includes('not found') || mensagem.includes('does not exist')
      if (!transitorio || tentativa === tentativas - 1) throw falha
      await new Promise((resolver) => setTimeout(resolver, 2500 * (tentativa + 1)))
    }
  }
  throw ultimaFalha
}

const mensagemDe = (falha: unknown, padrao: string) =>
  falha && (falha as Error).message ? (falha as Error).message : padrao

/* ------------------------------------------------------------------ */
/* Peças de interface                                                   */
/* ------------------------------------------------------------------ */

function Campo({
  rotulo,
  ajuda,
  erro,
  children,
}: {
  rotulo: string
  ajuda?: string
  erro?: string | null
  children: ReactNode
}) {
  return (
    <label className={estilos.campo}>
      <span>{rotulo}</span>
      {children}
      {erro ? <em className={estilos.erroCampo}>{erro}</em> : ajuda ? <em className={estilos.ajuda}>{ajuda}</em> : null}
    </label>
  )
}

function Opcao({
  nome,
  marcada,
  aoEscolher,
  titulo,
  descricao,
}: {
  nome: string
  marcada: boolean
  aoEscolher: () => void
  titulo: string
  descricao: string
}) {
  return (
    <label className={`${estilos.opcao} ${marcada ? estilos.on : ''}`}>
      <input type="radio" name={nome} checked={marcada} onChange={aoEscolher} />
      <div>
        <b>{titulo}</b>
        <small>{descricao}</small>
      </div>
    </label>
  )
}

const IconeCheck = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
)

const IconeX = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)

/* ------------------------------------------------------------------ */
/* Resultado da execução                                                */
/* ------------------------------------------------------------------ */

type ResultadoPasso = { rotulo: string; estado: 'ok' | 'erro'; detalhe?: string }

type Conclusao = {
  criada: boolean
  nome: string
  upn: string
  senha: string | null
  linkConvite: string | null
  passos: ResultadoPasso[]
}

/* ------------------------------------------------------------------ */
/* A tela                                                               */
/* ------------------------------------------------------------------ */

export function NovaConta() {
  const dr = useDadosReais()
  const toast = useToast()
  const navegar = useNavigate()
  const { catalogos } = useCatalogos()

  const [etapa, setEtapa] = useState<Etapa>(0)
  const [maiorEtapa, setMaiorEtapa] = useState<Etapa>(0)
  const [form, setForm] = useState<Formulario>(FORMULARIO_INICIAL)
  const [executando, setExecutando] = useState(false)
  const [conclusao, setConclusao] = useState<Conclusao | null>(null)

  const [grupos, setGrupos] = useState<GrupoReal[] | null>(null)
  const [carregandoGrupos, setCarregandoGrupos] = useState(false)
  const [erroGrupos, setErroGrupos] = useState<string | null>(null)
  const [buscaGrupo, setBuscaGrupo] = useState('')
  const [buscaGerente, setBuscaGerente] = useState('')
  const [buscaPapel, setBuscaPapel] = useState('')

  const usuarios = dr.usuarios

  useSubtitulo(
    conclusao
      ? conclusao.criada
        ? 'Conta criada no Microsoft 365'
        : 'A criação não foi concluída'
      : `Etapa ${etapa + 1} de ${ETAPAS.length} · ${ETAPAS[etapa].rotulo}`,
  )

  const mudar = <C extends keyof Formulario>(campo: C, valor: Formulario[C]) =>
    setForm((atual) => ({ ...atual, [campo]: valor }))

  const alternarNaLista = (campo: 'skuIds' | 'papeis' | 'grupos', id: string) =>
    setForm((atual) => ({
      ...atual,
      [campo]: atual[campo].includes(id) ? atual[campo].filter((item) => item !== id) : [...atual[campo], id],
    }))

  /* ---------- catálogos montados a partir do que já existe no tenant ---------- */

  /** Domínios em uso nas contas internas, do mais comum ao menos comum. */
  const dominios = useMemo(() => {
    const contagem = new Map<string, number>()
    for (const u of usuarios ?? []) {
      if (u.externo) continue
      const dominio = u.upn.split('@')[1]?.toLowerCase()
      if (dominio) contagem.set(dominio, (contagem.get(dominio) ?? 0) + 1)
    }
    return [...contagem.entries()].sort((a, b) => b[1] - a[1]).map(([dominio]) => dominio)
  }, [usuarios])

  useEffect(() => {
    if (!form.dominio && dominios.length > 0) mudar('dominio', dominios[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dominios])

  /**
   * Unidades e setores vêm do catálogo (Configurações > Unidades e setores), em lista fechada,
   * para a sigla não sair diferente a cada cadastro. Siglas que já existem no Entra mas
   * não estão no catálogo aparecem no fim, marcadas, para não sumirem da escolha.
   */
  const unidades = useMemo(() => {
    const noCatalogo = new Set(catalogos.unidades.map((u) => u.sigla))
    const foraDoCatalogo = [...new Set((usuarios ?? []).map((u) => u.departamento?.trim().toUpperCase() ?? '').filter(Boolean))]
      .filter((sigla) => !noCatalogo.has(sigla))
      .sort()
    return { catalogo: catalogos.unidades, foraDoCatalogo }
  }, [catalogos.unidades, usuarios])
  const setores = catalogos.setores

  const licencas = useMemo(
    () => [...dr.licencas].sort((a, b) => Number(b.livres > 0) - Number(a.livres > 0) || a.nome.localeCompare(b.nome, 'pt-BR')),
    [dr.licencas],
  )

  const candidatosGerente = useMemo(() => {
    const termo = buscaGerente.trim().toLowerCase()
    return (usuarios ?? [])
      .filter((u) => !u.externo && u.habilitada)
      .filter((u) => !termo || u.nome.toLowerCase().includes(termo) || u.upn.toLowerCase().includes(termo))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .slice(0, 40)
  }, [usuarios, buscaGerente])

  const gerente = useMemo(() => (usuarios ?? []).find((u) => u.id === form.gerenteId) ?? null, [usuarios, form.gerenteId])

  const gruposFiltrados = useMemo(() => {
    const termo = buscaGrupo.trim().toLowerCase()
    return (grupos ?? []).filter((g) => !termo || g.nome.toLowerCase().includes(termo) || (g.email ?? '').toLowerCase().includes(termo))
  }, [grupos, buscaGrupo])

  /* ---------- valores derivados ---------- */

  const upn = form.tipo === 'interno' ? `${form.usuario}@${form.dominio}` : form.emailConvidado.trim().toLowerCase()

  const nomeFinal =
    form.tipo === 'interno'
      ? form.nomeExibicao.trim() || `${form.primeiroNome} ${form.sobrenome}`.trim()
      : form.nomeExibicao.trim() || form.emailConvidado.trim()

  const jaExiste = useMemo(() => {
    if (!usuarios) return false
    if (form.tipo === 'interno') {
      if (!form.usuario || !form.dominio) return false
      return usuarios.some((u) => u.upn.toLowerCase() === upn.toLowerCase())
    }
    const email = form.emailConvidado.trim().toLowerCase()
    if (!email) return false
    const prefixo = prefixoConvidado(email)
    return usuarios.some((u) => u.upn.toLowerCase().startsWith(prefixo) || u.upn.toLowerCase() === email)
  }, [usuarios, form.tipo, form.usuario, form.dominio, form.emailConvidado, upn])

  const erroSenha = form.tipo === 'interno' && form.modoSenha === 'manual' ? problemaSenha(form.senhaManual) : null

  const basicoOk =
    form.tipo === 'interno'
      ? Boolean(nomeFinal) && Boolean(form.usuario) && Boolean(form.dominio) && !jaExiste && !erroSenha
      : EMAIL_VALIDO.test(form.emailConvidado.trim()) && !jaExiste

  const licencasOk = form.modoLicenca === 'sem' || (form.skuIds.length > 0 && Boolean(form.localUso))

  const papeisEscolhidos = form.acessoAdmin ? form.papeis : []
  const gruposEscolhidos = form.grupos
    .map((id) => grupos?.find((g) => g.id === id))
    .filter((g): g is GrupoReal => Boolean(g))

  const perfil: PerfilUsuario = {
    primeiroNome: form.tipo === 'interno' ? form.primeiroNome : undefined,
    sobrenome: form.tipo === 'interno' ? form.sobrenome : undefined,
    cargo: form.cargo,
    departamento: form.departamento,
    empresa: form.empresa,
    escritorio: form.escritorio,
    telefone: form.telefone,
    celular: form.celular,
    endereco: form.endereco,
    cidade: form.cidade,
    estado: form.estado,
    cep: form.cep,
    pais: form.pais,
  }

  const dadosFuncionais: DadosFuncionais = {
    setor: form.setor,
    cnpj: form.cnpj,
    matricula: form.matricula,
    vinculo: form.vinculo,
    dataAdmissao: form.dataAdmissao,
  }
  const resumoFuncional = [
    form.setor && `setor ${form.setor}`,
    form.cnpj && `CNPJ ${form.cnpj}`,
    form.matricula && `matrícula ${form.matricula}`,
    form.vinculo && `vínculo ${form.vinculo}`,
    form.dataAdmissao && `admissão ${dataBr(form.dataAdmissao)}`,
  ]
    .filter(Boolean)
    .join(' · ')

  const etapaValida = (qual: Etapa) => (qual === 0 ? basicoOk : qual === 1 ? licencasOk : true)

  function irPara(qual: Etapa) {
    setEtapa(qual)
    if (qual > maiorEtapa) setMaiorEtapa(qual)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function avancar() {
    if (!etapaValida(etapa)) return
    irPara(Math.min(etapa + 1, 3) as Etapa)
  }

  async function carregarGrupos() {
    setCarregandoGrupos(true)
    setErroGrupos(null)
    try {
      setGrupos(await lerGrupos())
    } catch (falha) {
      setErroGrupos(mensagemDe(falha, 'Não foi possível listar os grupos.'))
    } finally {
      setCarregandoGrupos(false)
    }
  }

  /* ---------- gravação de verdade no Microsoft 365 ---------- */

  async function concluir() {
    setExecutando(true)
    const passos: ResultadoPasso[] = []
    let id = ''
    let senha: string | null = null
    let linkConvite: string | null = null

    try {
      if (form.tipo === 'interno') {
        senha = form.modoSenha === 'automatica' ? gerarSenhaTemporaria() : form.senhaManual
        const criado = await criarUsuario({
          ...perfil,
          nome: nomeFinal,
          upn,
          senha,
          exigirTrocaSenha: form.exigirTroca,
          habilitada: form.habilitada,
          localUso: form.localUso,
        })
        id = criado.id
        passos.push({ rotulo: 'Conta criada no Microsoft 365', estado: 'ok', detalhe: upn })
      } else {
        const convite = await convidarExterno({
          email: form.emailConvidado,
          nome: form.nomeExibicao,
          mensagem: form.mensagemConvite,
          enviarEmail: form.enviarConvite,
        })
        id = convite.id
        linkConvite = convite.linkConvite || null
        passos.push({
          rotulo: form.enviarConvite ? 'Convite criado e e-mail enviado' : 'Convite criado (sem e-mail)',
          estado: 'ok',
          detalhe: form.emailConvidado.trim(),
        })
        try {
          await comRepeticao(() => atualizarPerfil(id, perfil))
        } catch (falha) {
          passos.push({ rotulo: 'Informações de perfil', estado: 'erro', detalhe: mensagemDe(falha, 'Falhou') })
        }
      }
    } catch (falha) {
      passos.push({
        rotulo: form.tipo === 'interno' ? 'Criar conta no Microsoft 365' : 'Convidar pessoa externa',
        estado: 'erro',
        detalhe: mensagemDe(falha, 'A Microsoft não aceitou a criação.'),
      })
      setConclusao({ criada: false, nome: nomeFinal, upn, senha: null, linkConvite: null, passos })
      setExecutando(false)
      return
    }

    if (resumoFuncional) {
      try {
        await comRepeticao(() => gravarDadosFuncionais(id, dadosFuncionais))
        passos.push({ rotulo: 'Dados da Nefroclínicas gravados', estado: 'ok', detalhe: resumoFuncional })
      } catch (falha) {
        passos.push({ rotulo: 'Gravar dados da Nefroclínicas', estado: 'erro', detalhe: mensagemDe(falha, 'Falhou') })
      }
    }

    if (form.modoLicenca === 'atribuir' && form.skuIds.length > 0) {
      const nomes = form.skuIds.map((sku) => dr.nomesPorSkuId.get(sku) ?? sku).join(', ')
      try {
        await comRepeticao(() => atribuirLicencas(id, form.skuIds))
        passos.push({ rotulo: 'Licenças atribuídas', estado: 'ok', detalhe: nomes })
      } catch (falha) {
        passos.push({ rotulo: 'Atribuir licenças', estado: 'erro', detalhe: mensagemDe(falha, 'Falhou') })
      }
    }

    for (const papelId of papeisEscolhidos) {
      const papel = papelPorId(papelId)
      try {
        await comRepeticao(() => atribuirPapel(id, papelId))
        passos.push({ rotulo: `Função: ${papel?.nome ?? papelId}`, estado: 'ok' })
      } catch (falha) {
        passos.push({ rotulo: `Função: ${papel?.nome ?? papelId}`, estado: 'erro', detalhe: mensagemDe(falha, 'Falhou') })
      }
    }

    if (gerente) {
      try {
        await comRepeticao(() => definirGerente(id, gerente.id))
        passos.push({ rotulo: 'Gestor imediato definido', estado: 'ok', detalhe: nomeTitulo(gerente.nome) })
      } catch (falha) {
        passos.push({ rotulo: 'Definir gestor imediato', estado: 'erro', detalhe: mensagemDe(falha, 'Falhou') })
      }
    }

    for (const grupo of gruposEscolhidos) {
      try {
        await comRepeticao(() => adicionarAoGrupo(grupo.id, id))
        passos.push({ rotulo: `Grupo: ${grupo.nome}`, estado: 'ok' })
      } catch (falha) {
        passos.push({ rotulo: `Grupo: ${grupo.nome}`, estado: 'erro', detalhe: mensagemDe(falha, 'Falhou') })
      }
    }

    await dr.recarregarUsuarios()
    toast(form.tipo === 'interno' ? 'Conta criada no Microsoft 365: ' + upn : 'Convite enviado para ' + upn)
    setConclusao({ criada: true, nome: nomeFinal, upn, senha, linkConvite, passos })
    setExecutando(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function recomecar() {
    setForm({ ...FORMULARIO_INICIAL, dominio: dominios[0] ?? '' })
    setConclusao(null)
    setEtapa(0)
    setMaiorEtapa(0)
  }

  async function copiar(texto: string, rotulo: string) {
    try {
      await navigator.clipboard.writeText(texto)
      toast(`${rotulo} copiado`)
    } catch {
      toast('Não deu para copiar automaticamente — selecione e copie à mão.')
    }
  }

  /* ---------- estados de carregamento ---------- */

  if (dr.erroConexao) return <Erro mensagem={dr.erroConexao} aoTentarNovamente={dr.conectar} />
  if (dr.conectando || !usuarios) {
    return dr.erroUsuarios ? <Erro mensagem={dr.erroUsuarios} /> : <Carregando texto="Lendo contas do Microsoft 365…" />
  }

  /* ---------- tela final ---------- */

  if (conclusao) {
    const corpoEmail = [
      `Olá, ${conclusao.nome}!`,
      '',
      'Seu acesso ao Microsoft 365 da Nefroclínicas foi criado.',
      '',
      `Usuário: ${conclusao.upn}`,
      conclusao.senha ? `Senha temporária: ${conclusao.senha}` : '',
      conclusao.linkConvite ? `Link do convite: ${conclusao.linkConvite}` : '',
      '',
      conclusao.senha ? 'No primeiro acesso em https://office.com você precisará trocar a senha.' : '',
    ]
      .filter((linha, indice, todas) => linha !== '' || todas[indice - 1] !== '')
      .join('\n')
    const mailto = `mailto:?subject=${encodeURIComponent('Seu acesso ao Microsoft 365 – Nefroclínicas')}&body=${encodeURIComponent(corpoEmail)}`

    return (
      <section className={`card ${estilos.resultado}`} style={{ padding: 24, maxWidth: 720 }}>
        <div className={estilos.sucesso}>
          <span className={`${estilos.selo} ${conclusao.criada ? '' : estilos.falha}`}>
            {conclusao.criada ? <IconeCheck /> : <IconeX />}
          </span>
          <div>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: 18, margin: 0 }}>
              {conclusao.criada ? `Conta de ${conclusao.nome} criada` : 'A conta não foi criada'}
            </h2>
            <p className="muted" style={{ margin: 0, fontSize: 12.8 }}>
              {conclusao.criada
                ? 'Gravado de verdade no tenant via Microsoft Graph.'
                : 'Nada foi gravado no Microsoft 365. Veja o motivo abaixo e tente de novo.'}
            </p>
          </div>
        </div>

        {conclusao.criada && (
          <>
            <div className={estilos.credencial}>
              <div>
                <span>{conclusao.senha ? 'Usuário' : 'E-mail convidado'}</span>
                <code>{conclusao.upn}</code>
              </div>
              <button className="btn" onClick={() => void copiar(conclusao.upn, 'Usuário')}>
                Copiar
              </button>
            </div>

            {conclusao.senha && (
              <div className={estilos.credencial}>
                <div>
                  <span>Senha temporária {form.exigirTroca ? '(troca obrigatória no primeiro login)' : ''}</span>
                  <code>{conclusao.senha}</code>
                </div>
                <button className="btn" onClick={() => void copiar(conclusao.senha ?? '', 'Senha')}>
                  Copiar
                </button>
              </div>
            )}

            {conclusao.linkConvite && (
              <div className={estilos.credencial}>
                <div>
                  <span>Link do convite (caso o e-mail não chegue)</span>
                  <code style={{ fontSize: 12 }}>{conclusao.linkConvite}</code>
                </div>
                <button className="btn" onClick={() => void copiar(conclusao.linkConvite ?? '', 'Link')}>
                  Copiar
                </button>
              </div>
            )}

            <p className={estilos.aviso}>
              {conclusao.senha
                ? 'Copie a senha agora e envie por um canal seguro: ela não aparece de novo depois que você sair desta tela.'
                : 'A pessoa recebe o convite no e-mail informado e entra com a conta dela própria.'}
            </p>
          </>
        )}

        <div>
          <div className={estilos.secao} style={{ marginBottom: 8 }}>
            O que foi feito
          </div>
          <div className={estilos.passos}>
            {conclusao.passos.map((passo, indice) => (
              <div key={indice} className={estilos.passo}>
                <span className={passo.estado === 'ok' ? estilos.ok : estilos.erro} style={{ display: 'inline-flex' }}>
                  {passo.estado === 'ok' ? <IconeCheck /> : <IconeX />}
                </span>
                <div style={{ minWidth: 0 }}>
                  {passo.rotulo}
                  {passo.detalhe && <small>{passo.detalhe}</small>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={estilos.rodape}>
          <div>
            <button className="btn btn-primary" onClick={recomecar}>
              Criar outra conta
            </button>
            <button className="btn" onClick={() => navegar('/usuarios?busca=' + encodeURIComponent(conclusao.upn.split('@')[0]))}>
              Ver na lista de usuários
            </button>
          </div>
          {conclusao.criada && (
            <a className="btn btn-ghost" href={mailto} style={{ textDecoration: 'none' }}>
              Enviar dados por e-mail
            </a>
          )}
        </div>
      </section>
    )
  }

  /* ---------- etapas ---------- */

  const conteudoEtapa: Record<Etapa, ReactNode> = {
    /* --------------------------- 1. Dados básicos --------------------------- */
    0: (
      <>
        <div className={estilos.cabecalho}>
          <h2>Dados básicos</h2>
          <p>Escolha o tipo de conta e preencha quem é a pessoa e como ela vai entrar.</p>
        </div>

        <div className={estilos.opcoes}>
          <Opcao
            nome="tipo"
            marcada={form.tipo === 'interno'}
            aoEscolher={() => mudar('tipo', 'interno')}
            titulo="Usuário da Nefroclínicas"
            descricao="Conta interna com e-mail no domínio da empresa, senha e (se quiser) licença."
          />
          <Opcao
            nome="tipo"
            marcada={form.tipo === 'convidado'}
            aoEscolher={() => mudar('tipo', 'convidado')}
            titulo="Convidado externo"
            descricao="Pessoa de fora (consultor, fornecedor) que entra com o e-mail dela via convite."
          />
        </div>

        {form.tipo === 'interno' ? (
          <>
            <div className={estilos.secao}>Nome</div>
            <div className={estilos.grid2}>
              <Campo rotulo="Nome">
                <input
                  value={form.primeiroNome}
                  autoFocus
                  placeholder="Ex.: Maria"
                  onChange={(e) => {
                    const primeiroNome = e.target.value
                    setForm((atual) => ({
                      ...atual,
                      primeiroNome,
                      nomeExibicao: atual.nomeExibicaoManual ? atual.nomeExibicao : `${primeiroNome} ${atual.sobrenome}`.trim(),
                      usuario: atual.usuarioManual ? atual.usuario : sugerirUsuario(primeiroNome, atual.sobrenome),
                    }))
                  }}
                />
              </Campo>
              <Campo rotulo="Sobrenome">
                <input
                  value={form.sobrenome}
                  placeholder="Ex.: Souza"
                  onChange={(e) => {
                    const sobrenome = e.target.value
                    setForm((atual) => ({
                      ...atual,
                      sobrenome,
                      nomeExibicao: atual.nomeExibicaoManual ? atual.nomeExibicao : `${atual.primeiroNome} ${sobrenome}`.trim(),
                      usuario: atual.usuarioManual ? atual.usuario : sugerirUsuario(atual.primeiroNome, sobrenome),
                    }))
                  }}
                />
              </Campo>
            </div>
            <Campo rotulo="Nome de exibição" ajuda="Como aparece no Outlook, no Teams e na lista de usuários.">
              <input
                value={form.nomeExibicao}
                placeholder="Ex.: Maria Souza"
                onChange={(e) => setForm((atual) => ({ ...atual, nomeExibicao: e.target.value, nomeExibicaoManual: true }))}
              />
            </Campo>

            <div className={estilos.secao}>Nome de usuário</div>
            <div className={estilos.upn}>
              <Campo rotulo="Usuário" erro={jaExiste ? 'Já existe uma conta com esse e-mail.' : null}>
                <input
                  value={form.usuario}
                  placeholder="maria.souza"
                  aria-invalid={jaExiste}
                  onChange={(e) =>
                    setForm((atual) => ({ ...atual, usuario: normalizarUsuario(e.target.value), usuarioManual: true }))
                  }
                />
              </Campo>
              <span className={estilos.arroba} style={{ marginTop: 22 }}>
                @
              </span>
              <Campo rotulo="Domínio">
                <select value={form.dominio} onChange={(e) => mudar('dominio', e.target.value)}>
                  {dominios.map((dominio) => (
                    <option key={dominio} value={dominio}>
                      {dominio}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
            <p className={estilos.ajuda} style={{ marginTop: -8 }}>
              E-mail final: <b className="mono">{form.usuario ? upn : '—'}</b>
            </p>

            <div className={estilos.secao}>Senha</div>
            <div className={estilos.opcoes}>
              <Opcao
                nome="senha"
                marcada={form.modoSenha === 'automatica'}
                aoEscolher={() => mudar('modoSenha', 'automatica')}
                titulo="Gerar senha automaticamente"
                descricao="Uma senha forte é criada na hora e mostrada uma única vez no final."
              />
              <Opcao
                nome="senha"
                marcada={form.modoSenha === 'manual'}
                aoEscolher={() => mudar('modoSenha', 'manual')}
                titulo="Eu defino a senha"
                descricao="Mínimo de 8 caracteres com 3 tipos (maiúsculas, minúsculas, números, símbolos)."
              />
            </div>
            {form.modoSenha === 'manual' && (
              <Campo rotulo="Senha" erro={form.senhaManual ? erroSenha : null}>
                <div className={estilos.senha}>
                  <input
                    type={form.mostrarSenha ? 'text' : 'password'}
                    value={form.senhaManual}
                    autoComplete="new-password"
                    onChange={(e) => mudar('senhaManual', e.target.value)}
                  />
                  <button type="button" className="btn" onClick={() => mudar('mostrarSenha', !form.mostrarSenha)}>
                    {form.mostrarSenha ? 'Ocultar' : 'Mostrar'}
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setForm((atual) => ({ ...atual, senhaManual: gerarSenhaTemporaria(), mostrarSenha: true }))}
                  >
                    Sugerir
                  </button>
                </div>
              </Campo>
            )}
            <div className={estilos.marcas}>
              <label>
                <input type="checkbox" checked={form.exigirTroca} onChange={(e) => mudar('exigirTroca', e.target.checked)} />
                Exigir que a pessoa troque a senha no primeiro acesso
              </label>
              <label>
                <input type="checkbox" checked={form.habilitada} onChange={(e) => mudar('habilitada', e.target.checked)} />
                Conta habilitada (desmarque para criar bloqueada e liberar depois)
              </label>
            </div>
          </>
        ) : (
          <>
            <div className={estilos.secao}>Quem convidar</div>
            <div className={estilos.grid2}>
              <Campo
                rotulo="E-mail da pessoa"
                erro={
                  jaExiste
                    ? 'Esse e-mail já foi convidado.'
                    : form.emailConvidado && !EMAIL_VALIDO.test(form.emailConvidado.trim())
                      ? 'Informe um e-mail válido.'
                      : null
                }
              >
                <input
                  type="email"
                  value={form.emailConvidado}
                  autoFocus
                  placeholder="pessoa@outraempresa.com.br"
                  aria-invalid={jaExiste}
                  onChange={(e) => mudar('emailConvidado', e.target.value)}
                />
              </Campo>
              <Campo rotulo="Nome de exibição" ajuda="Opcional; se vazio, a Microsoft usa o e-mail.">
                <input
                  value={form.nomeExibicao}
                  placeholder="Ex.: João Lima (Consultoria X)"
                  onChange={(e) => setForm((atual) => ({ ...atual, nomeExibicao: e.target.value, nomeExibicaoManual: true }))}
                />
              </Campo>
            </div>
            <Campo rotulo="Mensagem do convite" ajuda="Vai no corpo do e-mail que a Microsoft envia.">
              <textarea
                value={form.mensagemConvite}
                placeholder="Ex.: Olá! Estamos liberando seu acesso aos arquivos do projeto no Teams da Nefroclínicas."
                onChange={(e) => mudar('mensagemConvite', e.target.value)}
              />
            </Campo>
            <div className={estilos.marcas}>
              <label>
                <input type="checkbox" checked={form.enviarConvite} onChange={(e) => mudar('enviarConvite', e.target.checked)} />
                Enviar o e-mail de convite agora (desmarque para só gerar o link)
              </label>
            </div>
            <p className={estilos.ajuda}>
              A pessoa não recebe senha: ela entra com a conta que já tem (Microsoft, Google ou código por e-mail).
            </p>
          </>
        )}
      </>
    ),

    /* ------------------------------ 2. Licenças ----------------------------- */
    1: (
      <>
        <div className={estilos.cabecalho}>
          <h2>Licenças</h2>
          <p>Escolha o local de uso e os produtos. Sem licença a conta existe, mas não tem e-mail nem Office.</p>
        </div>

        <div className={estilos.opcoes}>
          <Opcao
            nome="licenca"
            marcada={form.modoLicenca === 'atribuir'}
            aoEscolher={() => mudar('modoLicenca', 'atribuir')}
            titulo="Atribuir licenças agora"
            descricao="Só aparecem para marcar os produtos com assento livre."
          />
          <Opcao
            nome="licenca"
            marcada={form.modoLicenca === 'sem'}
            aoEscolher={() => mudar('modoLicenca', 'sem')}
            titulo="Criar sem licença"
            descricao="Para contas de serviço, coletivas ou quando a licença vem depois."
          />
        </div>

        {form.modoLicenca === 'atribuir' && (
          <>
            <div className={estilos.grid2}>
              <Campo rotulo="Local de uso" ajuda="Exigido pela Microsoft para liberar a licença.">
                <select value={form.localUso} onChange={(e) => mudar('localUso', e.target.value)}>
                  {PAISES.map(([codigo, nome]) => (
                    <option key={codigo} value={codigo}>
                      {nome} ({codigo})
                    </option>
                  ))}
                </select>
              </Campo>
            </div>

            {form.tipo === 'convidado' && (
              <p className={estilos.aviso}>
                Convidados normalmente não precisam de licença: eles usam a da própria empresa. Marque só se for
                intencional.
              </p>
            )}

            <div className={estilos.lista}>
              {licencas.length === 0 && <div className={`${estilos.item} muted`}>Nenhuma licença encontrada no tenant.</div>}
              {licencas.map((licenca) => {
                const marcada = form.skuIds.includes(licenca.skuId)
                const semAssento = licenca.livres <= 0 && !marcada
                return (
                  <label
                    key={licenca.skuId}
                    className={`${estilos.item} ${semAssento ? estilos.desabilitado : ''}`}
                    title={semAssento ? 'Sem assento livre: compre mais ou libere uma conta parada.' : undefined}
                  >
                    <input
                      type="checkbox"
                      checked={marcada}
                      disabled={semAssento}
                      onChange={() => alternarNaLista('skuIds', licenca.skuId)}
                    />
                    <div className={estilos.texto}>
                      <b>{licenca.nome}</b>
                      <small className="mono">{licenca.skuPartNumber}</small>
                    </div>
                    <span className={estilos.contagem}>
                      {licenca.provavelAutosservico
                        ? 'ilimitado'
                        : `${Math.max(licenca.livres, 0)} de ${licenca.comprados} livres`}
                    </span>
                  </label>
                )
              })}
            </div>
          </>
        )}
      </>
    ),

    /* ------------------------ 3. Configurações opcionais -------------------- */
    2: (
      <>
        <div className={estilos.cabecalho}>
          <h2>Configurações opcionais</h2>
          <p>Tudo aqui pode ficar em branco e ser ajustado depois no Entra.</p>
        </div>

        <div className={estilos.secao}>Funções</div>
        <div className={estilos.opcoes}>
          <Opcao
            nome="funcao"
            marcada={!form.acessoAdmin}
            aoEscolher={() => mudar('acessoAdmin', false)}
            titulo="Usuário (sem acesso ao centro de administração)"
            descricao="O padrão para quase todo mundo."
          />
          <Opcao
            nome="funcao"
            marcada={form.acessoAdmin}
            aoEscolher={() => mudar('acessoAdmin', true)}
            titulo="Acesso ao centro de administração"
            descricao="Escolha uma ou mais funções administrativas."
          />
        </div>
        {form.acessoAdmin && (
          <>
            {form.papeis.some((id) => papelPorId(id)?.sensivel) && (
              <p className={estilos.alerta}>
                Você marcou uma função com acesso total. Confirme que é mesmo necessário — o ideal é dar a função mais
                restrita que resolve.
              </p>
            )}
            <input
              className={estilos.buscaLista}
              placeholder="Filtrar funções…"
              value={buscaPapel}
              onChange={(e) => setBuscaPapel(e.target.value)}
            />
            <div className={estilos.lista} style={{ maxHeight: 380, overflowY: 'auto' }}>
              {CATEGORIAS_PAPEIS.map((categoria) => {
                const termo = buscaPapel.trim().toLowerCase()
                const papeis = PAPEIS_ADMIN.filter(
                  (p) => p.categoria === categoria && (!termo || p.nome.toLowerCase().includes(termo) || p.descricao.toLowerCase().includes(termo)),
                )
                if (papeis.length === 0) return null
                return (
                  <div key={categoria}>
                    <div className={estilos.categoria}>{categoria}</div>
                    {papeis.map((papel) => (
                      <label key={papel.id} className={estilos.item}>
                        <input
                          type="checkbox"
                          checked={form.papeis.includes(papel.id)}
                          onChange={() => alternarNaLista('papeis', papel.id)}
                        />
                        <div className={estilos.texto}>
                          <b>
                            {papel.nome}
                            {papel.sensivel && (
                              <span className="badge b-bad" style={{ marginLeft: 8 }}>
                                acesso total
                              </span>
                            )}
                          </b>
                          <small>{papel.descricao}</small>
                        </div>
                      </label>
                    ))}
                  </div>
                )
              })}
            </div>
            <p className={estilos.ajuda}>
              Atribuir função exige que a sua conta seja Administrador global ou de funções com privilégios. Na primeira
              vez a Microsoft pede um consentimento extra.
            </p>
          </>
        )}

        <div className={estilos.secao}>Dados da Nefroclínicas</div>
        <div className={estilos.grid2}>
          <Campo rotulo="Cargo">
            <input value={form.cargo} placeholder="Ex.: Enfermeira" onChange={(e) => mudar('cargo', e.target.value)} />
          </Campo>
          <Campo rotulo="Unidade" ajuda="A sigla vai para o campo department do Entra e alimenta os filtros de região.">
            <select value={form.departamento} onChange={(e) => mudar('departamento', e.target.value)}>
              <option value="">Selecione…</option>
              {unidades.catalogo.map((unidade) => (
                <option key={unidade.sigla} value={unidade.sigla}>
                  {unidade.nome ? `${unidade.sigla} · ${unidade.nome}` : unidade.sigla}
                  {unidade.regiao ? ` (${unidade.regiao})` : ''}
                </option>
              ))}
              {unidades.foraDoCatalogo.length > 0 && (
                <optgroup label="No Entra, mas fora do catálogo">
                  {unidades.foraDoCatalogo.map((sigla) => (
                    <option key={sigla} value={sigla}>
                      {sigla}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </Campo>
          <Campo rotulo="Setor" ajuda="Vai para o campo divisão (employeeOrgData.division) do Entra.">
            <select value={form.setor} onChange={(e) => mudar('setor', e.target.value)}>
              <option value="">Selecione…</option>
              {setores.map((setor) => (
                <option key={setor} value={setor}>
                  {setor}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="CNPJ da unidade" ajuda="Vai para o centro de custo (employeeOrgData.costCenter).">
            <input
              inputMode="numeric"
              value={form.cnpj}
              placeholder="00.000.000/0000-00"
              onChange={(e) => mudar('cnpj', formatarCnpj(e.target.value))}
            />
          </Campo>
          <Campo rotulo="Matrícula" ajuda="Campo employeeId do Entra.">
            <input value={form.matricula} placeholder="Ex.: 004512" onChange={(e) => mudar('matricula', e.target.value)} />
          </Campo>
          <Campo rotulo="Vínculo" ajuda="Campo employeeType do Entra.">
            <input
              list="vinculos-nefro"
              value={form.vinculo}
              placeholder="Ex.: CLT"
              onChange={(e) => mudar('vinculo', e.target.value)}
            />
            <datalist id="vinculos-nefro">
              {VINCULOS.map((vinculo) => (
                <option key={vinculo} value={vinculo} />
              ))}
            </datalist>
          </Campo>
          <Campo rotulo="Data de admissão" ajuda="Campo employeeHireDate do Entra.">
            <input type="date" value={form.dataAdmissao} onChange={(e) => mudar('dataAdmissao', e.target.value)} />
          </Campo>
          <Campo rotulo="Empresa">
            <input value={form.empresa} onChange={(e) => mudar('empresa', e.target.value)} />
          </Campo>
        </div>
        <p className={estilos.ajuda} style={{ marginTop: -6 }}>
          Faltou uma unidade ou um setor na lista? Cadastre em{' '}
          <Link to="/configuracoes" style={{ color: 'var(--accent)' }}>
            Configurações › Unidades e setores
          </Link>
          .
        </p>

        <div className={estilos.secao}>Contato</div>
        <div className={estilos.grid2}>
          <Campo rotulo="Escritório / local">
            <input value={form.escritorio} placeholder="Ex.: Sede – Belo Horizonte" onChange={(e) => mudar('escritorio', e.target.value)} />
          </Campo>
          <Campo rotulo="Telefone comercial">
            <input value={form.telefone} placeholder="(31) 0000-0000" onChange={(e) => mudar('telefone', e.target.value)} />
          </Campo>
          <Campo rotulo="Celular">
            <input value={form.celular} placeholder="(31) 90000-0000" onChange={(e) => mudar('celular', e.target.value)} />
          </Campo>
        </div>

        <details className={estilos.dobra}>
          <summary>Endereço</summary>
          <div>
            <Campo rotulo="Endereço">
              <input value={form.endereco} onChange={(e) => mudar('endereco', e.target.value)} />
            </Campo>
            <div className={estilos.grid3}>
              <Campo rotulo="Cidade">
                <input value={form.cidade} onChange={(e) => mudar('cidade', e.target.value)} />
              </Campo>
              <Campo rotulo="Estado">
                <input value={form.estado} placeholder="MG" onChange={(e) => mudar('estado', e.target.value)} />
              </Campo>
              <Campo rotulo="CEP">
                <input value={form.cep} onChange={(e) => mudar('cep', e.target.value)} />
              </Campo>
            </div>
            <Campo rotulo="País">
              <input value={form.pais} onChange={(e) => mudar('pais', e.target.value)} />
            </Campo>
          </div>
        </details>

        <div className={estilos.secao}>Gestor imediato</div>
        <div className={estilos.grid2}>
          <Campo rotulo="Buscar gestor" ajuda="Só contas internas ativas; vai para o campo gerente (manager) do Entra.">
            <input
              value={buscaGerente}
              placeholder="Nome ou e-mail"
              onChange={(e) => setBuscaGerente(e.target.value)}
            />
          </Campo>
          <Campo rotulo="Gestor imediato">
            <select value={form.gerenteId} onChange={(e) => mudar('gerenteId', e.target.value)}>
              <option value="">Sem gestor definido</option>
              {gerente && !candidatosGerente.some((u) => u.id === gerente.id) && (
                <option value={gerente.id}>{nomeTitulo(gerente.nome)}</option>
              )}
              {candidatosGerente.map((u) => (
                <option key={u.id} value={u.id}>
                  {nomeTitulo(u.nome)} — {u.upn}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <div className={estilos.secao}>Grupos</div>
        {grupos === null ? (
          <div>
            <button className="btn" onClick={() => void carregarGrupos()} disabled={carregandoGrupos}>
              {carregandoGrupos ? 'Carregando grupos…' : 'Carregar grupos do tenant'}
            </button>
            <p className={estilos.ajuda} style={{ marginTop: 8 }}>
              Na primeira vez a Microsoft pede consentimento para ler e alterar membros de grupos.
            </p>
            {erroGrupos && <p className={estilos.alerta}>{erroGrupos}</p>}
          </div>
        ) : (
          <>
            <input
              className={estilos.buscaLista}
              placeholder="Filtrar grupos…"
              value={buscaGrupo}
              onChange={(e) => setBuscaGrupo(e.target.value)}
            />
            <div className={estilos.lista} style={{ maxHeight: 320, overflowY: 'auto' }}>
              {gruposFiltrados.length === 0 && <div className={`${estilos.item} muted`}>Nenhum grupo com esse nome.</div>}
              {gruposFiltrados.map((grupo) => (
                <label
                  key={grupo.id}
                  className={`${estilos.item} ${grupo.gerenciavel ? '' : estilos.desabilitado}`}
                  title={grupo.gerenciavel ? undefined : 'Lista de distribuição / grupo de segurança com e-mail: só muda pelo Exchange.'}
                >
                  <input
                    type="checkbox"
                    checked={form.grupos.includes(grupo.id)}
                    disabled={!grupo.gerenciavel}
                    onChange={() => alternarNaLista('grupos', grupo.id)}
                  />
                  <div className={estilos.texto}>
                    <b>{grupo.nome}</b>
                    <small>{grupo.email ?? 'sem e-mail'}</small>
                  </div>
                  <span className={estilos.contagem}>
                    {grupo.tipo === 'm365'
                      ? 'Microsoft 365'
                      : grupo.tipo === 'seguranca'
                        ? 'segurança'
                        : grupo.tipo === 'distribuicao'
                          ? 'distribuição'
                          : 'segurança c/ e-mail'}
                  </span>
                </label>
              ))}
            </div>
          </>
        )}
      </>
    ),

    /* ------------------------- 4. Revisar e concluir ------------------------ */
    3: (
      <>
        <div className={estilos.cabecalho}>
          <h2>Revisar e concluir</h2>
          <p>Confira. Ao concluir, tudo abaixo é gravado de verdade no Microsoft 365.</p>
        </div>

        <div className={estilos.resumo}>
          <div className={estilos.resumoBloco}>
            <header>
              <b>Dados básicos</b>
              <button onClick={() => irPara(0)}>Editar</button>
            </header>
            <div className={estilos.linha}>
              <span>Tipo</span>
              <b>{form.tipo === 'interno' ? 'Usuário da Nefroclínicas' : 'Convidado externo'}</b>
            </div>
            <div className={estilos.linha}>
              <span>Nome de exibição</span>
              <b>{nomeFinal || '—'}</b>
            </div>
            <div className={estilos.linha}>
              <span>{form.tipo === 'interno' ? 'E-mail / usuário' : 'E-mail convidado'}</span>
              <b className="mono">{upn}</b>
            </div>
            {form.tipo === 'interno' ? (
              <>
                <div className={estilos.linha}>
                  <span>Senha</span>
                  <b>{form.modoSenha === 'automatica' ? 'Gerada automaticamente' : 'Definida por você'}</b>
                </div>
                <div className={estilos.linha}>
                  <span>Primeiro acesso</span>
                  <b>{form.exigirTroca ? 'Exige troca de senha' : 'Mantém a senha'}</b>
                </div>
                <div className={estilos.linha}>
                  <span>Situação</span>
                  <b>{form.habilitada ? 'Habilitada' : 'Criada bloqueada'}</b>
                </div>
              </>
            ) : (
              <div className={estilos.linha}>
                <span>Convite</span>
                <b>{form.enviarConvite ? 'E-mail enviado pela Microsoft' : 'Só o link, sem e-mail'}</b>
              </div>
            )}
          </div>

          <div className={estilos.resumoBloco}>
            <header>
              <b>Licenças</b>
              <button onClick={() => irPara(1)}>Editar</button>
            </header>
            {form.modoLicenca === 'sem' || form.skuIds.length === 0 ? (
              <div className={estilos.linha}>
                <span>Produtos</span>
                <b>Sem licença</b>
              </div>
            ) : (
              <>
                <div className={estilos.linha}>
                  <span>Local de uso</span>
                  <b>{nomePais(form.localUso)}</b>
                </div>
                <div className={estilos.linha}>
                  <span>Produtos</span>
                  <b>{form.skuIds.map((sku) => dr.nomesPorSkuId.get(sku) ?? sku).join(', ')}</b>
                </div>
              </>
            )}
          </div>

          <div className={estilos.resumoBloco}>
            <header>
              <b>Configurações opcionais</b>
              <button onClick={() => irPara(2)}>Editar</button>
            </header>
            <div className={estilos.linha}>
              <span>Funções</span>
              <b>
                {papeisEscolhidos.length === 0
                  ? 'Usuário comum'
                  : papeisEscolhidos.map((id) => papelPorId(id)?.nome ?? id).join(', ')}
              </b>
            </div>
            <div className={estilos.linha}>
              <span>Cargo / unidade / setor</span>
              <b>{[form.cargo, form.departamento && descreverUnidade(form.departamento), form.setor].filter(Boolean).join(' · ') || '—'}</b>
            </div>
            <div className={estilos.linha}>
              <span>CNPJ / matrícula / vínculo</span>
              <b>{[form.cnpj, form.matricula, form.vinculo].filter(Boolean).join(' · ') || '—'}</b>
            </div>
            <div className={estilos.linha}>
              <span>Admissão</span>
              <b>{form.dataAdmissao ? dataBr(form.dataAdmissao) : '—'}</b>
            </div>
            <div className={estilos.linha}>
              <span>Contato</span>
              <b>{[form.telefone, form.celular, form.escritorio].filter(Boolean).join(' · ') || '—'}</b>
            </div>
            <div className={estilos.linha}>
              <span>Gestor imediato</span>
              <b>{gerente ? nomeTitulo(gerente.nome) : '—'}</b>
            </div>
            <div className={estilos.linha}>
              <span>Grupos</span>
              <b>{gruposEscolhidos.length === 0 ? '—' : gruposEscolhidos.map((g) => g.nome).join(', ')}</b>
            </div>
          </div>
        </div>

        <p className={estilos.aviso}>
          Isso grava no tenant de verdade e não tem um "desfazer" automático. Se alguma etapa extra (licença, função,
          grupo) falhar, a conta continua criada e a tela final mostra o que faltou.
        </p>
      </>
    ),
  }

  return (
    <>
      <button className={estilos.voltar} onClick={() => navegar('/usuarios')}>
        ← Voltar para Usuários
      </button>

      <section className={`card ${estilos.assistente}`}>
        <aside className={estilos.trilha}>
          <h3 className={estilos.trilhaTitulo}>Nova conta</h3>
          {ETAPAS.map((item, indice) => {
            const qual = indice as Etapa
            const feita = qual < etapa || (qual < maiorEtapa && etapaValida(qual))
            return (
              <button
                key={item.rotulo}
                className={`${estilos.etapa} ${qual === etapa ? estilos.atual : feita ? estilos.feita : ''}`}
                disabled={qual > maiorEtapa || executando}
                onClick={() => irPara(qual)}
              >
                <span className={estilos.numero}>{feita ? '✓' : indice + 1}</span>
                <span>
                  {item.rotulo}
                  <small className={estilos.ajuda} style={{ display: 'block' }}>
                    {item.descricao}
                  </small>
                </span>
              </button>
            )
          })}
          <p className={estilos.trilhaRodape}>
            As mesmas opções do "Adicionar um usuário" do centro de administração do Microsoft 365, gravadas via
            Microsoft Graph com a sua conta.
          </p>
        </aside>

        <div className={estilos.conteudo}>
          {conteudoEtapa[etapa]}

          <div className={estilos.rodape}>
            <div>
              {etapa > 0 && (
                <button className="btn" onClick={() => irPara((etapa - 1) as Etapa)} disabled={executando}>
                  Voltar
                </button>
              )}
              {etapa < 3 ? (
                <button className="btn btn-primary" onClick={avancar} disabled={!etapaValida(etapa)}>
                  Avançar
                </button>
              ) : (
                <button className="btn btn-primary" onClick={() => void concluir()} disabled={executando || !basicoOk || !licencasOk}>
                  {executando ? 'Gravando no Microsoft 365…' : form.tipo === 'interno' ? 'Concluir e criar conta' : 'Concluir e enviar convite'}
                </button>
              )}
            </div>
            <button className="btn btn-ghost" onClick={() => navegar('/usuarios')} disabled={executando}>
              Cancelar
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
