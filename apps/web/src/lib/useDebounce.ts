import { useEffect, useState } from 'react'

/** Segura o valor por alguns ms para nao disparar uma consulta por tecla digitada. */
export function useDebounce<T>(valor: T, atraso = 250): T {
  const [atrasado, setAtrasado] = useState(valor)

  useEffect(() => {
    const timer = setTimeout(() => setAtrasado(valor), atraso)
    return () => clearTimeout(timer)
  }, [valor, atraso])

  return atrasado
}
