/**
 * `npm run db:seed` - recria o tenant de demonstracao no banco.
 * A logica em si fica em `src/semear.ts`, que o servidor tambem usa no boot.
 */
import { PrismaClient } from '@prisma/client'
import { semear } from '../src/semear.js'

const prisma = new PrismaClient()

semear(prisma)
  .then(({ planos, contas }) => console.log(`Seed concluido: ${planos} planos, ${contas} contas.`))
  .catch((erro) => {
    console.error(erro)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
