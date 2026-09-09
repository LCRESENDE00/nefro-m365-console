import { ConfidentialClientApplication, type Configuration } from '@azure/msal-node'

// Cliente MSAL para o fluxo de autenticacao real com Microsoft Entra ID.
// So fica pronto quando as tres variaveis abaixo estao preenchidas no .env
// da API (ver apps/api/.env.example e docs/entra-id-setup.md). Sem elas, as
// rotas de auth respondem 503 e o login continua no modo simulado.
const tenantId = process.env.AZURE_TENANT_ID
const clientId = process.env.AZURE_CLIENT_ID
const clientSecret = process.env.AZURE_CLIENT_SECRET

export const entraConfigurado = Boolean(tenantId && clientId && clientSecret)

const configuracao: Configuration = {
    auth: {
          clientId: clientId ?? '',
          clientSecret: clientSecret ?? '',
          authority: `https://login.microsoftonline.com/${tenantId ?? 'common'}`,
    },
}

export const msalClient = entraConfigurado ? new ConfidentialClientApplication(configuracao) : null

// Permissoes de aplicativo do Microsoft Graph pedidas no login.
export const ESCOPOS_GRAPH = (process.env.GRAPH_SCOPES ?? 'User.Read.All,Reports.Read.All')
  .split(',')
  .map((escopo) => escopo.trim())
  .filter(Boolean)
