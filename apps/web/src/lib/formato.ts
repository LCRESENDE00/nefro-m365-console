import type { StatusConta } from '../data'

export const money = (valor: number) =>
  `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export const money0 = (valor: number) =>
  `R$ ${valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`

export const numero = (valor: number) => valor.toLocaleString('pt-BR')

/** Iniciais para o avatar: ignora preposicoes curtas ("de", "da"). */
export const iniciais = (nome: string) =>
  nome
.split(' ')
.filter((parte) => parte.length > 2)
.slice(0, 2)
.map((parte) => parte[0])
.join('')
.toUpperCase()

/** Padroniza nomes de conta e de licenca: primeira letra de cada palavra em maiusculo. */
export const nomeTitulo = (nome: string): string =>
  nome
.toLowerCase()
.split(' ')
.map((parte) => (parte.length ? parte[0].toUpperCase() + parte.slice(1) : parte))
.join(' ')

export const quando = (dias: number | null) => {
  if (dias === null) return 'nunca'
  if (dias === 0) return 'hoje'
  if (dias === 1) return 'ontem'
  return `há ${dias} dias`
}

export const BADGE: Record<StatusConta, { classe: string; rotulo: string }> = {
  ativo: { classe: 'b-ok', rotulo: 'Ativo' },
  ocioso: { classe: 'b-warn', rotulo: 'Ocioso' },
  inativo: { classe: 'b-bad', rotulo: 'Inativo' },
  nunca: { classe: 'b-neutral', rotulo: 'Nunca acessou' },
}

export const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
