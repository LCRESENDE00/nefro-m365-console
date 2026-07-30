import { Router } from 'express'
import { listarContas, listarSkus } from '../consultas.js'
import { lerConfiguracoes, prisma } from '../db.js'
import { dataArquivo, paraCsv, quando } from '../dominio.js'

export const rotasRelatorios = Router()

const ROTULO_STATUS: Record<string, string> = {
  ativo: 'Ativo',
  ocioso: 'Ocioso',
  inativo: 'Inativo',
  nunca: 'Nunca acessou',
}

const numero = (valor: number) => valor.toFixed(2).replace('.', ',')

type Planilha = { cabecalho: string[]; linhas: Array<Array<string | number>> }

/** Cada relatorio e so uma funcao que devolve cabecalho + linhas. */
const RELATORIOS: Record<string, { titulo: string; montar: () => Promise<Planilha> }> = {
  'usuarios-inativos': {
    titulo: 'Contas sem acesso',
    async montar() {
      const contas = (await listarContas()).sort(
        (a, b) => (b.diasUltimoAcesso ?? 9999) - (a.diasUltimoAcesso ?? 9999),
      )
      return {
        cabecalho: ['Nome', 'Conta', 'Cargo', 'Setor', 'Licença', 'Último acesso', 'Dias', 'Status', 'Custo mensal (R$)'],
        linhas: contas.map((c) => [
          c.nome,
          c.upn,
          c.cargo,
          c.depto,
          c.sku.curto,
          quando(c.diasUltimoAcesso),
          c.diasUltimoAcesso ?? '',
          ROTULO_STATUS[c.status],
          numero(c.sku.preco),
        ]),
      }
    },
  },
  licencas: {
    titulo: 'Inventário de licenças',
    async montar() {
      const [skus, contas] = await Promise.all([listarSkus(), listarContas()])
      return {
        cabecalho: ['Plano', 'Preço/assento (R$)', 'Contratados', 'Atribuídos', 'Em uso', 'Sem acesso', 'Livres', 'Custo mensal (R$)', 'Custo anual (R$)'],
        linhas: skus.map((sku) => {
          const doPlano = contas.filter((c) => c.sku.codigo === sku.codigo)
          const emUso = doPlano.filter((c) => c.status === 'ativo').length
          return [
            sku.nome,
            numero(sku.preco),
            sku.comprados,
            doPlano.length,
            emUso,
            doPlano.length - emUso,
            sku.comprados - doPlano.length,
            numero(sku.preco * sku.comprados),
            numero(sku.preco * sku.comprados * 12),
          ]
        }),
      }
    },
  },
  onedrive: {
    titulo: 'Uso do OneDrive',
    async montar() {
      const contas = (await listarContas()).sort((a, b) => b.oneDriveGb - a.oneDriveGb)
      return {
        cabecalho: ['Nome', 'Conta', 'Setor', 'Espaço (GB)', 'Arquivos', 'Status'],
        linhas: contas.map((c) => [
          c.nome,
          c.upn,
          c.depto,
          numero(c.oneDriveGb),
          c.arquivos,
          ROTULO_STATUS[c.status],
        ]),
      }
    },
  },
  mfa: {
    titulo: 'Segurança das contas',
    async montar() {
      // Pendencias primeiro, como diz a descricao do relatorio na tela.
      const contas = (await listarContas())
        .filter((c) => !c.ehRecurso)
        .sort((a, b) => Number(a.mfa) - Number(b.mfa) || a.depto.localeCompare(b.depto, 'pt-BR'))
      return {
        cabecalho: ['Nome', 'Conta', 'Setor', 'MFA', 'Último acesso', 'Status'],
        linhas: contas.map((c) => [
          c.nome,
          c.upn,
          c.depto,
          c.mfa ? 'configurado' : 'PENDENTE',
          quando(c.diasUltimoAcesso),
          ROTULO_STATUS[c.status],
        ]),
      }
    },
  },
}

/** GET /api/relatorios - catalogo das exportacoes disponiveis + historico. */
rotasRelatorios.get('/', async (_req, res) => {
  const config = await lerConfiguracoes()
  res.json({
    disponiveis: Object.entries(RELATORIOS).map(([tipo, r]) => ({ tipo, titulo: r.titulo })),
    historico: await prisma.exportacao.findMany({ orderBy: { criadoEm: 'desc' }, take: 12 }),
    envioAutomatico: {
      resumoMensal: config.resumoMensal === 'true',
      alertaContaInativa: config.alertaContaInativa === 'true',
      copiaPastaTI: config.copiaPastaTI === 'true',
      destinatario: config.contaConectada ?? '',
    },
  })
})

/**
 * POST /api/relatorios/:tipo - gera o CSV de verdade a partir do banco,
 * registra a exportacao no historico e devolve o arquivo para download.
 */
rotasRelatorios.post('/:tipo', async (req, res) => {
  const relatorio = RELATORIOS[req.params.tipo]
  if (!relatorio) return res.status(404).json({ erro: 'Relatório desconhecido' })

  const config = await lerConfiguracoes()
  const { cabecalho, linhas } = await relatorio.montar()
  const arquivo = `${req.params.tipo}-${dataArquivo()}.csv`

  await prisma.exportacao.create({
    data: {
      arquivo,
      geradoPor: config.contaConectada?.split('@')[0]?.replace('.', ' ') ?? 'console',
      linhas: linhas.length,
    },
  })

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${arquivo}"`)
  res.setHeader('X-Nome-Arquivo', arquivo)
  res.send(paraCsv(cabecalho, linhas))
})

/** POST /api/relatorios/selecao/usuarios - exporta exatamente o filtro da tela de Usuarios. */
rotasRelatorios.post('/selecao/usuarios', async (req, res) => {
  const upns: string[] = Array.isArray(req.body?.upns) ? req.body.upns : []
  const contas = (await listarContas()).filter((c) => upns.includes(c.upn))
  const arquivo = `usuarios-filtrados-${dataArquivo()}.csv`
  const config = await lerConfiguracoes()

  await prisma.exportacao.create({
    data: {
      arquivo,
      geradoPor: config.contaConectada?.split('@')[0]?.replace('.', ' ') ?? 'console',
      linhas: contas.length,
    },
  })

  const csv = paraCsv(
    ['Nome', 'Conta', 'Cargo', 'Setor', 'Licença', 'Último acesso', 'MFA', 'OneDrive (GB)', 'Status', 'Custo mensal (R$)'],
    contas.map((c) => [
      c.nome,
      c.upn,
      c.cargo,
      c.depto,
      c.sku.curto,
      quando(c.diasUltimoAcesso),
      c.ehRecurso ? '—' : c.mfa ? 'configurado' : 'PENDENTE',
      numero(c.oneDriveGb),
      ROTULO_STATUS[c.status],
      numero(c.sku.preco),
    ]),
  )

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${arquivo}"`)
  res.setHeader('X-Nome-Arquivo', arquivo)
  res.send(csv)
})
