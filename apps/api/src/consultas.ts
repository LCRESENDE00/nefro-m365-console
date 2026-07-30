import { statusConta, type ContaCalculada } from '@nefro/dominio'
import { lerLimiares, prisma } from './db.js'

/**
 * Fonte unica das contas ja com o status calculado. Respeita a preferencia
 * "incluir contas de recurso" das Configuracoes.
 */
export async function listarContas(): Promise<ContaCalculada[]> {
  const limiares = await lerLimiares()
  const usuarios = await prisma.usuario.findMany({
    include: { sku: true },
    orderBy: { nome: 'asc' },
  })

  return usuarios
    .filter((u) => limiares.incluirRecursos || !u.ehRecurso)
    .map((u) => ({
      id: u.id,
      nome: u.nome,
      upn: u.upn,
      cargo: u.cargo,
      depto: u.depto,
      diasUltimoAcesso: u.diasUltimoAcesso,
      mfa: u.mfa,
      oneDriveGb: u.oneDriveGb,
      arquivos: u.arquivos,
      ehRecurso: u.ehRecurso,
      status: statusConta(u.diasUltimoAcesso, limiares),
      sku: {
        codigo: u.sku.codigo,
        nome: u.sku.nome,
        curto: u.sku.curto,
        preco: u.sku.preco,
        cor: u.sku.cor,
      },
    }))
}

export async function listarSkus() {
  return prisma.sku.findMany({ orderBy: { ordem: 'asc' } })
}

/** Serie agregada do tenant (usuarioId nulo). */
export async function serieDoTenant(): Promise<number[]> {
  const linhas = await prisma.acessoSemanal.findMany({
    where: { usuarioId: null },
    orderBy: { semana: 'asc' },
  })
  return linhas.map((l) => l.valor)
}

export async function serieDeAcessos(usuarioId: number): Promise<number[]> {
  const linhas = await prisma.acessoSemanal.findMany({
    where: { usuarioId },
    orderBy: { semana: 'asc' },
  })
  return linhas.map((l) => l.valor)
}
