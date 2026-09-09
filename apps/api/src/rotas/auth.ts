import { randomUUID } from 'node:crypto'
import { Router } from 'express'
import { ESCOPOS_GRAPH, entraConfigurado, msalClient } from '../auth/msal.js'

const REDIRECT_URI = process.env.AZURE_REDIRECT_URI ?? 'http://localhost:3333/api/auth/callback'
const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:5173'
const NOME_COOKIE = 'nefro_sessao'

type SessaoEntra = { tenantId: string; clientId: string; nome: string; email: string }

// Sessoes em memoria: suficiente para uso local (npm run dev). Reinicia a API
// e todo mundo precisa logar de novo -- nao ha persistencia em banco aqui.
const sessoes = new Map<string, SessaoEntra>()

export const rotasAuth = Router()

rotasAuth.get('/login', async (_req, res) => {
    if (!entraConfigurado || !msalClient) {
          res.status(503).json({
                  erro: 'Entra ID nao configurado. Preencha AZURE_TENANT_ID, AZURE_CLIENT_ID e AZURE_CLIENT_SECRET no .env da API.',
          })
          return
    }

                const urlLogin = await msalClient.getAuthCodeUrl({
                      scopes: ESCOPOS_GRAPH,
                      redirectUri: REDIRECT_URI,
                })

                res.redirect(urlLogin)
})

rotasAuth.get('/callback', async (req, res) => {
    if (!entraConfigurado || !msalClient) {
          res.redirect(`${FRONTEND_URL}/login?erro=entra-nao-configurado`)
          return
    }

                const code = typeof req.query.code === 'string' ? req.query.code : undefined
    if (!code) {
          res.redirect(`${FRONTEND_URL}/login?erro=codigo-ausente`)
          return
    }

                try {
                      const resultado = await msalClient.acquireTokenByCode({
                              code,
                              scopes: ESCOPOS_GRAPH,
                              redirectUri: REDIRECT_URI,
                      })

      const idSessao = randomUUID()
                      sessoes.set(idSessao, {
                              tenantId: resultado.account?.tenantId ?? '',
                              clientId: process.env.AZURE_CLIENT_ID ?? '',
                              nome: resultado.account?.name ?? '',
                              email: resultado.account?.username ?? '',
                      })

      res.cookie(NOME_COOKIE, idSessao, {
              httpOnly: true,
              sameSite: 'lax',
              maxAge: 1000 * 60 * 60 * 8,
      })
                      res.redirect(`${FRONTEND_URL}/visao-geral`)
                } catch (erro) {
                      console.error('Falha no login com Entra ID', erro)
                      res.redirect(`${FRONTEND_URL}/login?erro=login-falhou`)
                }
})

rotasAuth.get('/me', (req, res) => {
    const idSessao = req.cookies?.[NOME_COOKIE]
    const sessao = idSessao ? sessoes.get(idSessao) : undefined

                if (!sessao) {
                      res.json({ autenticado: false })
                      return
                }

                res.json({ autenticado: true, ...sessao })
})

rotasAuth.post('/logout', (req, res) => {
    const idSessao = req.cookies?.[NOME_COOKIE]
    if (idSessao) sessoes.delete(idSessao)
    res.clearCookie(NOME_COOKIE)
    res.json({ ok: true })
})
