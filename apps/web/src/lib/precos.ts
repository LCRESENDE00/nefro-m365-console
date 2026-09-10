import { useCallback, useState } from 'react'

/**
 * Valor unitário mensal (R$) de cada licença paga, por código técnico (skuPartNumber).
 *
 * A Microsoft Graph não informa o que a clínica paga por licença, então os valores
 * vêm da fatura. Os padrões abaixo são da fatura atual (plano anual, pagamento mensal);
 * qualquer alteração feita na tela Economia fica no localStorage do navegador.
 */
export const PRECOS_PADRAO: Record<string, number> = {
  O365_BUSINESS_ESSENTIALS: 31.15, // Microsoft 365 Business Basic
  O365_BUSINESS_PREMIUM: 77.97, // Microsoft 365 Business Standard
}

const CHAVE = 'nefro-m365:precos-licencas'

export type Precos = Record<string, number>

export function lerPrecos(): Precos {
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return { ...PRECOS_PADRAO }
    const salvo = JSON.parse(bruto)
    const limpo: Precos = {}
    for (const [sku, valor] of Object.entries(salvo ?? {})) {
      if (typeof valor === 'number' && Number.isFinite(valor) && valor >= 0) limpo[sku] = valor
    }
    return { ...PRECOS_PADRAO, ...limpo }
  } catch {
    return { ...PRECOS_PADRAO }
  }
}

function salvarPrecos(precos: Precos) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(precos))
  } catch {
    // sem localStorage (modo privado etc.): o valor vale só enquanto a tela estiver aberta
  }
}

/** Converte o que a pessoa digitou ("77,97", "R$ 77.97") em número; devolve null se não der. */
export function interpretarPreco(texto: string): number | null {
  const limpo = texto.replace(/[^\d,.-]/g, '').trim()
  if (!limpo) return null
  // Aceita tanto vírgula quanto ponto como separador decimal; o último separador é o decimal.
  const ultimaVirgula = limpo.lastIndexOf(',')
  const ultimoPonto = limpo.lastIndexOf('.')
  const normalizado =
    ultimaVirgula > ultimoPonto
      ? limpo.replace(/\./g, '').replace(',', '.')
      : limpo.replace(/,/g, '')
  const valor = Number(normalizado)
  return Number.isFinite(valor) && valor >= 0 ? valor : null
}

export function usePrecos() {
  const [precos, setPrecos] = useState<Precos>(lerPrecos)

  const definirPreco = useCallback((skuPartNumber: string, valor: number | null) => {
    setPrecos((atual) => {
      const novo = { ...atual }
      if (valor === null) delete novo[skuPartNumber]
      else novo[skuPartNumber] = valor
      salvarPrecos(novo)
      return novo
    })
  }, [])

  const restaurarPadrao = useCallback(() => {
    const padrao = { ...PRECOS_PADRAO }
    salvarPrecos(padrao)
    setPrecos(padrao)
  }, [])

  return { precos, definirPreco, restaurarPadrao }
}
