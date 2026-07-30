import { useCallback, useEffect, useState } from 'react'

type Estado<T> = { dados: T | null; carregando: boolean; erro: string | null }

/**
 * Carrega dados de um repositorio e reexecuta quando `deps` muda.
 * Suficiente para o tamanho deste app: sem cache global, sem lib externa.
 */
export function useConsulta<T>(buscar: () => Promise<T>, deps: unknown[] = []) {
  const [estado, setEstado] = useState<Estado<T>>({ dados: null, carregando: true, erro: null })

  const executar = useCallback(() => {
    let cancelado = false
    setEstado((atual) => ({ ...atual, carregando: true, erro: null }))
    buscar()
      .then((dados) => {
        if (!cancelado) setEstado({ dados, carregando: false, erro: null })
      })
      .catch((erro: Error) => {
        if (!cancelado) setEstado({ dados: null, carregando: false, erro: erro.message })
      })
    return () => {
      cancelado = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(executar, [executar])

  return { ...estado, recarregar: executar }
}
