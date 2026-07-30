import { Router } from 'express'
import { listarContas, listarSkus } from '../consultas.js'
import { contaOciosa } from '../dominio.js'

export const rotasLicencas = Router()

/** GET /api/licencas - assentos contratados x atribuidos x em uso, por plano. */
rotasLicencas.get('/', async (_req, res) => {
  const [skus, contas] = await Promise.all([listarSkus(), listarContas()])

  const planos = skus.map((sku) => {
    const doPlano = contas.filter((c) => c.sku.codigo === sku.codigo)
    const emUso = doPlano.filter((c) => c.status === 'ativo').length
    const semAcesso = doPlano.length - emUso
    const livres = sku.comprados - doPlano.length

    return {
      codigo: sku.codigo,
      nome: sku.nome,
      curto: sku.curto,
      cor: sku.cor,
      preco: sku.preco,
      comprados: sku.comprados,
      atribuidos: doPlano.length,
      emUso,
      semAcesso,
      livres,
      custoMensal: sku.preco * sku.comprados,
      custoDesperdicado: sku.preco * (semAcesso + livres),
    }
  })

  res.json({
    planos,
    custoAtribuido: contas.reduce((soma, c) => soma + c.sku.preco, 0),
    custoContratado: planos.reduce((soma, p) => soma + p.custoMensal, 0),
    assentosLivres: planos.reduce((soma, p) => soma + p.livres, 0),
    economiaPossivel: contas.filter((c) => contaOciosa(c.status)).reduce((soma, c) => soma + c.sku.preco, 0),
    totalContas: contas.length,
  })
})
