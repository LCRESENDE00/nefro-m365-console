/**
 * Regras de negocio do console. Ficam so aqui: a UI consome o status ja
 * calculado, entao mudar um limiar nao exige tocar em nenhuma tela.
 */

export type StatusConta = 'ativo' | 'ocioso' | 'inativo' | 'nunca'

export type Limiares = { limiarOcioso: number; limiarInativo: number }

/**
 * Classifica a conta pelo tempo desde o ultimo acesso.
 * `null` significa que a conta nunca registrou login (salas, caixas compartilhadas).
 */
export function statusConta(diasUltimoAcesso: number | null, limiares: Limiares): StatusConta {
  if (diasUltimoAcesso === null) return 'nunca'
  if (diasUltimoAcesso <= limiares.limiarOcioso) return 'ativo'
  if (diasUltimoAcesso <= limiares.limiarInativo) return 'ocioso'
  return 'inativo'
}

/** Toda conta que nao esta ativa paga licenca sem uso. */
export function contaOciosa(status: StatusConta): boolean {
  return status !== 'ativo'
}

export function quando(diasUltimoAcesso: number | null): string {
  if (diasUltimoAcesso === null) return 'nunca'
  if (diasUltimoAcesso === 0) return 'hoje'
  if (diasUltimoAcesso === 1) return 'ontem'
  return `há ${diasUltimoAcesso} dias`
}

/** Soma o custo mensal das licencas atribuidas a contas sem uso recente. */
export function custoOcioso(contas: Array<{ status: StatusConta; preco: number }>): number {
  return contas.filter((c) => contaOciosa(c.status)).reduce((total, c) => total + c.preco, 0)
}

export function dataArquivo(agora = new Date()): string {
  const dd = String(agora.getDate()).padStart(2, '0')
  const mm = String(agora.getMonth() + 1).padStart(2, '0')
  return `${dd}-${mm}-${agora.getFullYear()}`
}

/** CSV com separador `;` e BOM: e o que o Excel em pt-BR abre sem perguntar nada. */
export function paraCsv(cabecalho: string[], linhas: Array<Array<string | number>>): string {
  const escapar = (valor: string | number) => {
    const texto = String(valor)
    return /[;"\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
  }
  const corpo = [cabecalho, ...linhas].map((linha) => linha.map(escapar).join(';')).join('\r\n')
  return `﻿${corpo}`
}
