import {
  CONFIGURACOES_PADRAO,
  EXPORTACOES_INICIAIS,
  SERIE_TENANT,
  SKUS,
  USUARIOS,
  serieDoUsuario,
} from '@nefro/dominio'
import type { PrismaClient } from '@prisma/client'

/**
 * Grava o tenant de demonstracao no banco.
 *
 * Vive em `src/` (e nao so no script do Prisma) porque o servidor tambem chama
 * isto no boot: em hospedagem com disco efemero, o banco nasce vazio a cada
 * deploy e precisa se popular sozinho.
 */
export async function semear(prisma: PrismaClient) {
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

  return { planos: SKUS.length, contas: USUARIOS.length }
}

/** Semeia so se o banco ainda estiver vazio, para nao apagar o que foi alterado. */
export async function semearSeVazio(prisma: PrismaClient) {
  if ((await prisma.sku.count()) > 0) return null
  return semear(prisma)
}
