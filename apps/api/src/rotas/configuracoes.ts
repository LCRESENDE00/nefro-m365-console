import { Router } from 'express'
import { gravarConfiguracoes, lerConfiguracoes, prisma } from '../db.js'

export const rotasConfiguracoes = Router()

/** Chaves que a tela de Configuracoes pode gravar. Nada fora dessa lista passa. */
const CHAVES_EDITAVEIS = [
  'limiarOcioso',
  'limiarInativo',
  'atualizarAoAbrir',
  'incluirRecursos',
  'modoDemo',
  'resumoMensal',
  'alertaContaInativa',
  'copiaPastaTI',
]

const PERMISSOES = [
  'User.ReadWrite.All',
  'Directory.ReadWrite.All',
  'UserAuthenticationMethod.ReadWrite.All',
  'Organization.Read.All',
  'Reports.Read.All',
  'AuditLog.Read.All',
]

rotasConfiguracoes.get('/', async (_req, res) => {
  const config = await lerConfiguracoes()
  res.json({
    tenantId: config.tenantId ?? '',
    clientId: config.clientId ?? '',
    contaConectada: config.contaConectada ?? '',
    limiarOcioso: Number(config.limiarOcioso ?? 30),
    limiarInativo: Number(config.limiarInativo ?? 90),
    atualizarAoAbrir: config.atualizarAoAbrir === 'true',
    incluirRecursos: config.incluirRecursos === 'true',
    modoDemo: config.modoDemo === 'true',
    resumoMensal: config.resumoMensal === 'true',
    alertaContaInativa: config.alertaContaInativa === 'true',
    copiaPastaTI: config.copiaPastaTI === 'true',
    permissoes: PERMISSOES,
    marcadasParaRevisao: (
      await prisma.configuracao.findMany({ where: { chave: { startsWith: 'revisao:' } } })
    ).map((c) => c.chave.slice('revisao:'.length)),
  })
})

/** PATCH /api/configuracoes - grava so as chaves conhecidas, como texto. */
rotasConfiguracoes.patch('/', async (req, res) => {
  const entrada = (req.body ?? {}) as Record<string, unknown>
  const valores: Record<string, string> = {}

  for (const chave of CHAVES_EDITAVEIS) {
    if (chave in entrada) valores[chave] = String(entrada[chave])
  }

  if (Object.keys(valores).length === 0) {
    return res.status(400).json({ erro: 'Nenhuma preferência reconhecida no corpo da requisição' })
  }

  await gravarConfiguracoes(valores)
  res.json({ atualizadas: Object.keys(valores) })
})
