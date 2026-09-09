import type { ArquivoGerado } from '../data'

/** Dispara o download de um arquivo ja gerado pela API. */
export function baixar({ nome, conteudo }: ArquivoGerado) {
  const url = URL.createObjectURL(conteudo)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
