/**
 * Popula o banco com o tenant de demonstracao.
 * Os dados vem de `@nefro/dominio`, os mesmos que a demo estatica do
 * GitHub Pages consome sem backend.
 */
import { PrismaClient } from '@prisma/client'
import {
  CONFIGURACOES_PADRAO,
  EXPORTACOES_INICIAIS,
  SERIE_TENANT,
  SKUS,
  USUARIOS,
  serieDoUsuario,
} from '@nefro/dominio'

const prisma = new PrismaClient()

async function main() {
  // Ordem importa: Usuario referencia Sku.
  await prisma.acessoSemanal.deleteMany()
  await prisma.usuario.deleteMany()
  await prisma.sku.deleteMany()
  await prisma.exportacao.deleteMany()
  await prisma.configuracao.deleteMany()

  await prisma.sku.createMany({ data: SKUS })

  for (const usuario of USUARIOS) {
    await prisma.usuario.create({
      data: {
        ...usuario,
        acessos: {
          create: serieDoUsuario(usuario.diasUltimoAcesso).map((valor, semana) => ({ semana, valor })),
        },
      },
    })
  }

  await prisma.acessoSemanal.createMany({
    data: SERIE_TENANT.map((valor, semana) => ({ semana, valor, usuarioId: null })),
  })

  await prisma.configuracao.createMany({ data: CONFIGURACOES_PADRAO })
  await prisma.exportacao.createMany({
    data: EXPORTACOES_INICIAIS.map((e) => ({ ...e, criadoEm: new Date(e.criadoEm) })),
  })

  console.log(`Seed concluido: ${SKUS.length} planos, ${USUARIOS.length} contas.`)
}

main()
  .catch((erro) => {
    console.error(erro)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
