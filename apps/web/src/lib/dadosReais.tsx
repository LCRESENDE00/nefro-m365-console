import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  criarUsuario as criarUsuarioGraph,
  definirHabilitada,
  gerarSenhaTemporaria,
  lerArmazenamento,
  lerContaConectada,
  lerLicencas,
  lerRegistroMfa,
  lerUsuarios,
  redefinirSenha as redefinirSenhaGraph,
 removerTodasLicencas as removerTodasLicencasGraph,
  type ContaArmazenamento,
  type LicencaReal,
  type NovoUsuario,
  type RegistroMfa,
  type UsuarioReal,
} from './graph'

export type StatusReal = 'ativo' | 'ocioso' | 'inativo' | 'nunca'

export function diasParaStatus(dias: number | null, limiarOcioso: number, limiarInativo: number): StatusReal {
  if (dias === null) return 'nunca'
  if (dias <= limiarOcioso) return 'ativo'
  if (dias <= limiarInativo) return 'ocioso'
  return 'inativo'
}

type Estado = {
  conectando: boolean
  conectado: boolean
  erroConexao: string | null
  nome?: string
  licencas: LicencaReal[]
  usuarios: UsuarioReal[] | null
  erroUsuarios: string | null
  mfa: RegistroMfa[] | null
  erroMfa: string | null
  armazenamento: ContaArmazenamento[] | null
  erroArmazenamento: string | null
  limiarOcioso: number
  limiarInativo: number
}

type Contexto = Estado & {
  conectar: () => Promise<void>
  recarregarUsuarios: () => Promise<void>
  definirLimiarInativo: (dias: number) => void
  nomesPorSkuId: Map<string, string>
  nomesLicencasDoUsuario: (u: UsuarioReal) => string
  mapaMfa: Map<string, boolean>
  mapaArmazenamento: Map<string, number>
  criarUsuario: (dados: NovoUsuario) => Promise<{ id: string }>
  redefinirSenha: (id: string) => Promise<string>
  alternarSituacao: (id: string, habilitarPara: boolean) => Promise<void>
 removerLicencas: (id: string, skuIds: string[]) => Promise<void>
}

const ESTADO_INICIAL: Estado = {
  conectando: false,
  conectado: false,
  erroConexao: null,
  licencas: [],
  usuarios: null,
  erroUsuarios: null,
  mfa: null,
  erroMfa: null,
  armazenamento: null,
  erroArmazenamento: null,
  limiarOcioso: 30,
  limiarInativo: 90,
}

const DadosReaisContext = createContext<Contexto | null>(null)

export function useDadosReais(): Contexto {
  const ctx = useContext(DadosReaisContext)
  if (!ctx) throw new Error('useDadosReais precisa estar dentro de <DadosReaisProvider>')
  return ctx
}

export function DadosReaisProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>(ESTADO_INICIAL)

  const conectar = useCallback(async () => {
    setEstado((s) => ({ ...s, conectando: true, erroConexao: null }))
    try {
      const licencas = await lerLicencas()
      const conta = await lerContaConectada().catch(() => null)
      const [rUsuarios, rMfa, rArmazenamento] = await Promise.allSettled([
        lerUsuarios(),
        lerRegistroMfa(),
        lerArmazenamento(),
      ])
      setEstado((s) => ({
        ...s,
        conectando: false,
        conectado: true,
        nome: conta?.nome,
        licencas,
        usuarios: rUsuarios.status === 'fulfilled' ? rUsuarios.value : null,
        erroUsuarios: rUsuarios.status === 'rejected' ? String((rUsuarios.reason as any)?.message ?? rUsuarios.reason) : null,
        mfa: rMfa.status === 'fulfilled' ? rMfa.value : null,
        erroMfa: rMfa.status === 'rejected' ? String((rMfa.reason as any)?.message ?? rMfa.reason) : null,
        armazenamento: rArmazenamento.status === 'fulfilled' ? rArmazenamento.value : null,
        erroArmazenamento:
          rArmazenamento.status === 'rejected' ? String((rArmazenamento.reason as any)?.message ?? rArmazenamento.reason) : null,
      }))
    } catch (e: any) {
      setEstado((s) => ({
        ...s,
        conectando: false,
        erroConexao: e && e.message ? e.message : 'Nao foi possivel conectar com a Microsoft.',
      }))
    }
  }, [])

  const recarregarUsuarios = useCallback(async () => {
    try {
      const usuarios = await lerUsuarios()
      setEstado((s) => ({ ...s, usuarios, erroUsuarios: null }))
    } catch {
      // mantem a lista antiga; a mudanca real ja foi feita no Microsoft 365
    }
  }, [])

  const definirLimiarInativo = useCallback((dias: number) => {
    setEstado((s) => ({ ...s, limiarInativo: dias }))
  }, [])

  const criarUsuario = useCallback(
    async (dados: NovoUsuario) => {
      const criado = await criarUsuarioGraph(dados)
      await recarregarUsuarios()
      return criado
    },
    [recarregarUsuarios],
  )

  const redefinirSenha = useCallback(async (id: string) => {
    const senha = gerarSenhaTemporaria()
    await redefinirSenhaGraph(id, senha)
    return senha
  }, [])

  const alternarSituacao = useCallback(
    async (id: string, habilitarPara: boolean) => {
      await definirHabilitada(id, habilitarPara)
      await recarregarUsuarios()
    },
    [recarregarUsuarios],
  )

  const removerLicencas = useCallback(
 async (id: string, skuIds: string[]) => {
 await removerTodasLicencasGraph(id, skuIds)
 await recarregarUsuarios()
 },
 [recarregarUsuarios],
 )

 const nomesPorSkuId = useMemo(() => new Map(estado.licencas.map((l) => [l.skuId, l.nome])), [estado.licencas])

  const mapaMfa = useMemo(
    () => new Map((estado.mfa ?? []).map((m) => [m.upn.toLowerCase(), m.mfaRegistrado])),
    [estado.mfa],
  )

  const mapaArmazenamento = useMemo(
    () => new Map((estado.armazenamento ?? []).map((c) => [c.upn.toLowerCase(), c.gb])),
    [estado.armazenamento],
  )

  const nomesLicencasDoUsuario = useCallback(
    (u: UsuarioReal) => (u.skuIds.length === 0 ? '-' : u.skuIds.map((id) => nomesPorSkuId.get(id) ?? id).join(', ')),
    [nomesPorSkuId],
  )

  const valor = useMemo<Contexto>(
    () => ({
      ...estado,
      conectar,
      recarregarUsuarios,
      definirLimiarInativo,
      nomesPorSkuId,
      nomesLicencasDoUsuario,
      mapaMfa,
      mapaArmazenamento,
      criarUsuario,
      redefinirSenha,
      alternarSituacao,
 removerLicencas,
    }),
    [
      estado,
      conectar,
      recarregarUsuarios,
      definirLimiarInativo,
      nomesPorSkuId,
      nomesLicencasDoUsuario,
      mapaMfa,
      mapaArmazenamento,
      criarUsuario,
      redefinirSenha,
      alternarSituacao,
 removerLicencas,
    ],
  )

  return <DadosReaisContext.Provider value={valor}>{children}</DadosReaisContext.Provider>
}
