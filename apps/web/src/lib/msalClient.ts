import { PublicClientApplication } from '@azure/msal-browser'

export const MSAL_CLIENT_ID = import.meta.env.VITE_MSAL_CLIENT_ID ?? ''
export const MSAL_TENANT_ID = import.meta.env.VITE_MSAL_TENANT_ID ?? ''

export const msalInstance = new PublicClientApplication({
  auth: {
    clientId: MSAL_CLIENT_ID,
    authority: 'https://login.microsoftonline.com/' + MSAL_TENANT_ID,
    redirectUri: '/login',
  },
  cache: {
    cacheLocation: 'localStorage',
  },
})

let inicializado: Promise<void> | null = null

export function garantirMsalInicializado() {
  if (!inicializado) {
    inicializado = msalInstance.initialize()
  }
  return inicializado
}

export async function entrarELerLicencasReais() {
  if (!MSAL_CLIENT_ID || !MSAL_TENANT_ID) { throw new Error('Configuracao ausente: defina VITE_MSAL_CLIENT_ID e VITE_MSAL_TENANT_ID (veja apps/web/.env.example e docs/entra-id-setup.md).') } await garantirMsalInicializado()

const resultado = await msalInstance.loginPopup({
  scopes: ['Organization.Read.All'],
})

const resposta = await fetch('https://graph.microsoft.com/v1.0/subscribedSkus', {
  headers: { Authorization: 'Bearer ' + resultado.accessToken },
})

if (!resposta.ok) {
  throw new Error('Microsoft Graph respondeu ' + resposta.status)
}

const dados = await resposta.json()

const skus = (dados.value ?? []).map(function (sku: any) {
  return {
    skuId: sku.skuId,
    skuPartNumber: sku.skuPartNumber,
    comprados: sku.prepaidUnits ? sku.prepaidUnits.enabled ?? 0 : 0,
    emUso: sku.consumedUnits ?? 0,
    livres: (sku.prepaidUnits ? sku.prepaidUnits.enabled ?? 0 : 0) - (sku.consumedUnits ?? 0),
  }
})

return { nome: resultado.account ? resultado.account.name : undefined, skus: skus }
}
