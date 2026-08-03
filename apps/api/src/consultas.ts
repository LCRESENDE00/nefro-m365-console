import {
  statusConta,
  type ClassificacaoConta,
  type ContaCalculada,
  type RegimeConta,
  type TipoContrato,
  type TipoLicenca,
} from '@nefro/dominio'
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
      unidade: u.unidade,
      cnpj: u.cnpj,
      diasUltimoAcesso: u.diasUltimoAcesso,
      mfa: u.mfa,
      oneDriveGb: u.oneDriveGb,
      arquivos: u.arquivos,
      ehRecurso: u.ehRecurso,
      habilitada: u.habilitada,
      // O banco guarda texto livre; o dominio define o conjunto valido na escrita.
      classificacao: u.classificacao as ClassificacaoConta,
      regime: u.regime as RegimeConta,
      tipoLicenca: u.tipoLicenca as TipoLicenca,
      produto: u.produto,
      tipoContrato: u.tipoContrato as TipoContrato,
      dataRenovacao: u.dataRenovacao,
      valorTotal: u.valorTotal,
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
