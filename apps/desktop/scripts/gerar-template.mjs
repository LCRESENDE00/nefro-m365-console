/**
 * Gera `recursos/dados-template.db`: um SQLite vazio, so com o schema.
 *
 * O app empacotado nao tem o CLI do Prisma para criar as tabelas na primeira
 * execucao, entao ele copia este arquivo para a pasta de dados do usuario.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const raizDesktop = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const schema = resolve(raizDesktop, '..', 'api', 'prisma', 'schema.prisma')
const pastaRecursos = join(raizDesktop, 'recursos')
const destino = join(pastaRecursos, 'dados-template.db')

mkdirSync(pastaRecursos, { recursive: true })
// Recria sempre: se o schema mudou, o template tem que acompanhar.
if (existsSync(destino)) rmSync(destino)

// Chama o CLI do Prisma pelo arquivo resolvido, e nao por `npx`: em Windows o
// npx.cmd nao e executavel direto por execFileSync.
const require = createRequire(import.meta.url)
const pastaPrisma = dirname(require.resolve('prisma/package.json'))
const manifesto = JSON.parse(readFileSync(join(pastaPrisma, 'package.json'), 'utf8'))
const binPrisma = join(pastaPrisma, typeof manifesto.bin === 'string' ? manifesto.bin : manifesto.bin.prisma)

execFileSync(process.execPath, [binPrisma, 'db', 'push', '--schema', schema, '--skip-generate'], {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: `file:${destino}` },
})

if (!existsSync(destino)) {
  console.error('Template nao foi criado em', destino)
  process.exit(1)
}

console.log('Template do banco gerado em', destino)
