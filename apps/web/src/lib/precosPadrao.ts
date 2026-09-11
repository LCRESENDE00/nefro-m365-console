/**
 * Valor unitário mensal (R$) de cada licença paga, por código técnico (skuPartNumber).
 *
 * A Microsoft Graph não informa o que a clínica paga por licença, então os valores
 * vêm da fatura (plano anual, pagamento mensal). Módulo sem dependência de navegador:
 * a tela Economia (lib/precos.ts) e o envio automático (scripts/envio-automatico.ts) leem daqui.
 */
export type Precos = Record<string, number>

export const PRECOS_PADRAO: Precos = {
  O365_BUSINESS_ESSENTIALS: 31.15, // Microsoft 365 Business Basic
  O365_BUSINESS_PREMIUM: 77.97, // Microsoft 365 Business Standard
}
