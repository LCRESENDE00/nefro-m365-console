import { PublicClientApplication } from '@azure/msal-browser'

export const MSAL_CLIENT_ID = 'b83c7794-ddee-4018-a079-6b290f044d3b'
export const MSAL_TENANT_ID = '00714dc9-4ce9-4734-948f-aa1af877a01'

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

let inicializado = null

export function garantirMsalInicializado() {
  if (!inicializado) {
    inicializado = msalInstance.initialize()
  }
  return inicializado
}

export async function entrarELerLicencasReais() {
  await garantirMsalInicializado()

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

const skus = (dados.value ?? []).map(function (sku) {
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
