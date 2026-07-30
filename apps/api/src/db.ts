import { PrismaClient } from '@prisma/client'
import { existsSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Raiz de apps/api, valendo tanto para src/ (tsx) quanto para dist/ (build).
const raizApi = resolve(fileURLToPath(new URL('.', import.meta.url)), '..')

const arquivoEnv = join(raizApi, '.env')
if (existsSync(arquivoEnv)) process.loadEnvFile(arquivoEnv)

// O Prisma resolve caminhos SQLite relativos a pasta do schema. Aqui o caminho
// vira absoluto para que `npm start` funcione a partir de qualquer diretorio.
const url = process.env.DATABASE_URL ?? 'file:./dev.db'
if (url.startsWith('file:') && !isAbsolute(url.slice('file:'.length))) {
  process.env.DATABASE_URL = `file:${join(raizApi, 'prisma', url.slice('file:'.length))}`
}

export const prisma = new PrismaClient()

/** Le todas as preferencias do console como um mapa chave -> valor. */
export async function lerConfiguracoes(): Promise<Record<string, string>> {
  const linhas = await prisma.configuracao.findMany()
  return Object.fromEntries(linhas.map((c) => [c.chave, c.valor]))
}

export async function gravarConfiguracoes(valores: Record<string, string>) {
  await prisma.$transaction(
    Object.entries(valores).map(([chave, valor]) =>
      prisma.configuracao.upsert({
        where: { chave },
        create: { chave, valor },
        update: { valor },
      }),
    ),
  )
}

/** Limiares usados para classificar uma conta, ja convertidos para numero. */
export async function lerLimiares() {
  const config = await lerConfiguracoes()
  const limiarOcioso = Number(config.limiarOcioso ?? 30)
  return {
    limiarOcioso,
    // Nunca deixa a faixa "ocioso" desaparecer se as preferencias se cruzarem.
    limiarInativo: Math.max(Number(config.limiarInativo ?? 90), limiarOcioso),
    incluirRecursos: (config.incluirRecursos ?? 'true') === 'true',
  }
}
