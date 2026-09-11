import { useCallback, useState } from 'react'
import { PRECOS_PADRAO, type Precos } from './precosPadrao'

// Os valores padrao (da fatura) ficam em lib/precosPadrao.ts, sem React, para o
// envio automatico usar os mesmos numeros. Re-exportados aqui para as telas.
export { PRECOS_PADRAO, type Precos }

const CHAVE = 'nefro-m365:precos-licencas'

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
