/** Wrapper minimo de fetch. So a camada `data/http` importa este arquivo. */

const BASE = '/api'

async function garantirOk(resposta: Response) {
  if (resposta.ok) return resposta
  const corpo = await resposta.json().catch(() => ({}))
  throw new Error(corpo.erro ?? `Falha na requisição (${resposta.status})`)
}

export async function pegarJson<T>(caminho: string): Promise<T> {
  const resposta = await garantirOk(await fetch(`${BASE}${caminho}`))
  return resposta.json() as Promise<T>
}

export async function enviarJson<T>(caminho: string, metodo: string, corpo?: unknown): Promise<T> {
  const resposta = await garantirOk(
    await fetch(`${BASE}${caminho}`, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    }),
  )
  return resposta.json() as Promise<T>
}

/** POST que devolve arquivo. O nome vem no header X-Nome-Arquivo. */
export async function baixarArquivo(caminho: string, corpo?: unknown) {
  const resposta = await garantirOk(
    await fetch(`${BASE}${caminho}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    }),
  )
  return {
    nome: resposta.headers.get('X-Nome-Arquivo') ?? 'relatorio.csv',
    conteudo: await resposta.blob(),
  }
}

export function montarQuery(params: Record<string, string | number>) {
  return `?${new URLSearchParams(
    Object.entries(params).map(([chave, valor]) => [chave, String(valor)]),
  ).toString()}`
}
