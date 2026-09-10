/** Montagem de CSV para exportação (Excel abre direto com o BOM na frente). */

export function celulaCsv(valor: string | number): string {
  const texto = String(valor ?? '')
  if (/[",\n;]/.test(texto)) return '"' + texto.replace(/"/g, '""') + '"'
  return texto
}

export function linhasParaCsv(linhas: (string | number)[][]): string {
  return linhas.map((linha) => linha.map(celulaCsv).join(',')).join('\n')
}

/** Blob pronto pra download: BOM UTF-8 + conteúdo, pra acentos abrirem certos no Excel. */
export function blobCsv(linhas: (string | number)[][]): Blob {
  return new Blob(['\uFEFF' + linhasParaCsv(linhas)], { type: 'text/csv;charset=utf-8;' })
}
