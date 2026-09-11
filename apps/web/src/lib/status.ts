/**
 * Classificação de uma conta pelo tempo sem acesso.
 *
 * Fica num módulo sem React nem MSAL porque é usado tanto nas telas quanto no
 * script de envio automático (apps/web/scripts/envio-automatico.ts), que roda em Node.
 */
export type StatusReal = 'ativo' | 'ocioso' | 'inativo' | 'nunca'

export function diasParaStatus(dias: number | null, limiarOcioso: number, limiarInativo: number): StatusReal {
  if (dias === null) return 'nunca'
  if (dias <= limiarOcioso) return 'ativo'
  if (dias <= limiarInativo) return 'ocioso'
  return 'inativo'
}
