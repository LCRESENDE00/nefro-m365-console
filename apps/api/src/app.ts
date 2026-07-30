import cors from 'cors'
import express from 'express'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { prisma, raizApi } from './db.js'
import { rotasArmazenamento } from './rotas/armazenamento.js'
import { rotasConfiguracoes } from './rotas/configuracoes.js'
import { rotasLicencas } from './rotas/licencas.js'
import { rotasMetricas } from './rotas/metricas.js'
import { rotasRelatorios } from './rotas/relatorios.js'
import { rotasUsuarios } from './rotas/usuarios.js'
import { semearSeVazio } from './semear.js'

export type OpcoesApp = {
  /** Pasta com o front buildado. Quando informada, a API tambem serve a interface. */
  pastaEstatica?: string
}

/** Monta a aplicacao Express. Quem chama decide em que porta ela escuta. */
export function criarApp({ pastaEstatica }: OpcoesApp = {}) {
  const app = express()

  app.use(cors({ exposedHeaders: ['X-Nome-Arquivo'] }))
  app.use(express.json())

  app.get('/api/saude', async (_req, res) => {
    const contas = await prisma.usuario.count()
    res.json({ ok: true, contas, sincronizadoEm: new Date().toISOString() })
  })

  app.use('/api/usuarios', rotasUsuarios)
  app.use('/api/licencas', rotasLicencas)
  app.use('/api/metricas', rotasMetricas)
  app.use('/api/armazenamento', rotasArmazenamento)
  app.use('/api/relatorios', rotasRelatorios)
  app.use('/api/configuracoes', rotasConfiguracoes)

  // Front buildado: usado pelo app de desktop, que carrega tudo do mesmo host.
  const pasta = pastaEstatica ?? join(raizApi, '..', 'web', 'dist')
  if (existsSync(pasta)) {
    app.use(express.static(pasta))
    app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(join(pasta, 'index.html')))
  }

  app.use((erro: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(erro)
    res.status(500).json({ erro: 'Erro interno ao consultar o banco' })
  })

  return app
}

/**
 * Sobe a API e devolve a porta real. `porta: 0` deixa o sistema escolher uma
 * livre, que e o que o app de desktop usa para nao brigar com outros programas.
 */
export async function iniciarApi(porta: number, opcoes: OpcoesApp = {}) {
  await semearSeVazio(prisma)

  const app = criarApp(opcoes)
  const servidor = app.listen(porta)

  await new Promise<void>((resolve, reject) => {
    servidor.once('listening', resolve)
    servidor.once('error', reject)
  })

  const endereco = servidor.address()
  const portaReal = typeof endereco === 'object' && endereco ? endereco.port : porta

  return { servidor, porta: portaReal }
}
