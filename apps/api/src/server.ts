import cors from 'cors'
import express from 'express'
import { prisma } from './db.js'
import { rotasArmazenamento } from './rotas/armazenamento.js'
import { rotasConfiguracoes } from './rotas/configuracoes.js'
import { rotasLicencas } from './rotas/licencas.js'
import { rotasMetricas } from './rotas/metricas.js'
import { rotasRelatorios } from './rotas/relatorios.js'
import { rotasUsuarios } from './rotas/usuarios.js'

const app = express()
const porta = Number(process.env.PORT ?? 3333)

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

app.use((erro: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(erro)
  res.status(500).json({ erro: 'Erro interno ao consultar o banco' })
})

app.listen(porta, () => {
  console.log(`API do Console M365 em http://localhost:${porta}`)
})
