/**
 * Agregacoes das telas, como funcoes puras sobre `ContaCalculada[]`.
 *
 * A API chama estas funcoes com o que veio do banco; a demo estatica chama as
 * mesmas com o que veio do seed. Por isso os dois caminhos exibem numeros
 * identicos sem manter duas contas separadas.
 */
import { contaOciosa } from './dominio.js'
import type { SkuSeed } from './dados.js'
import type {
  ContaCalculada,
  FiltroContas,
  Limiares,
  PaginaContas,
  ResumoArmazenamento,
  ResumoLicencas,
  VisaoGeral,
} from './tipos.js'

export function filtrarContas(todas: ContaCalculada[], filtro: FiltroContas): PaginaContas {
  const busca = filtro.q.trim().toLowerCase()

  const contas = todas
    .filter((c) => {
      if (filtro.status !== 'todos' && c.status !== filtro.status) return false
      if (filtro.depto !== 'todos' && c.depto !== filtro.depto) return false
      if (busca && !`${c.nome}${c.upn}${c.cargo}`.toLowerCase().includes(busca)) return false
      return true
    })
    .sort((a, b) => {
      const valor = (c: ContaCalculada) =>
        filtro.sort === 'dias' ? (c.diasUltimoAcesso ?? 9999) : filtro.sort === 'gb' ? c.oneDriveGb : c.nome
      const va = valor(a)
      const vb = valor(b)
      return (va > vb ? 1 : va < vb ? -1 : 0) * filtro.dir
    })

  return {
    contas,
    total: todas.length,
    deptos: [...new Set(todas.map((c) => c.depto))].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    custoSelecao: contas.filter((c) => contaOciosa(c.status)).reduce((soma, c) => soma + c.sku.preco, 0),
  }
}

export function calcularVisaoGeral(
  contas: ContaCalculada[],
  limiares: Limiares,
  serieAcessos: number[],
): VisaoGeral {
  const pessoas = contas.filter((c) => c.diasUltimoAcesso !== null)

  const porSku = new Map<string, { curto: string; cor: string; valor: number }>()
  let desperdicioTotal = 0
  for (const conta of contas) {
    if (!contaOciosa(conta.status)) continue
    const atual = porSku.get(conta.sku.codigo) ?? { curto: conta.sku.curto, cor: conta.sku.cor, valor: 0 }
    atual.valor += conta.sku.preco
    porSku.set(conta.sku.codigo, atual)
    desperdicioTotal += conta.sku.preco
  }

  const noIntervalo = (min: number, max: number) =>
    contas.filter((c) => c.diasUltimoAcesso !== null && c.diasUltimoAcesso > min && c.diasUltimoAcesso <= max)
      .length

  return {
    limiares,
    totalContas: contas.length,
    ativos: contas.filter((c) => c.status === 'ativo').length,
    ociosos: contas.filter((c) => c.status === 'ocioso').length,
    inativos: contas.filter((c) => c.status === 'inativo' || c.status === 'nunca').length,
    semMfa: pessoas.filter((c) => !c.mfa).length,
    totalPessoas: pessoas.length,
    desperdicioTotal,
    desperdicioPorSku: [...porSku.entries()]
      .map(([codigo, d]) => ({ codigo, ...d }))
      .sort((a, b) => b.valor - a.valor),
    serieAcessos,
    distribuicaoAcesso: [
      { faixa: '0–30 dias', valor: noIntervalo(-1, 30), cor: '#3FBFA8' },
      { faixa: '31–60', valor: noIntervalo(30, 60), cor: '#E0A44A' },
      { faixa: '61–90', valor: noIntervalo(60, 90), cor: '#E0A44A' },
      { faixa: '90+', valor: contas.filter((c) => (c.diasUltimoAcesso ?? 0) > 90).length, cor: '#F2657A' },
      { faixa: 'nunca', valor: contas.filter((c) => c.diasUltimoAcesso === null).length, cor: '#4a5162' },
    ],
    precisamRevisao: contas
      .filter((c) => contaOciosa(c.status))
      .sort((a, b) => (b.diasUltimoAcesso ?? 9999) - (a.diasUltimoAcesso ?? 9999))
      .slice(0, 6),
  }
}

export function calcularLicencas(contas: ContaCalculada[], skus: SkuSeed[]): ResumoLicencas {
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

  return {
    planos,
    custoAtribuido: contas.reduce((soma, c) => soma + c.sku.preco, 0),
    custoContratado: planos.reduce((soma, p) => soma + p.custoMensal, 0),
    assentosLivres: planos.reduce((soma, p) => soma + p.livres, 0),
    economiaPossivel: contas
      .filter((c) => contaOciosa(c.status))
      .reduce((soma, c) => soma + c.sku.preco, 0),
    totalContas: contas.length,
  }
}

export function calcularArmazenamento(contas: ContaCalculada[], quotaGb: number): ResumoArmazenamento {
  const porSetor = new Map<string, number>()
  for (const conta of contas) porSetor.set(conta.depto, (porSetor.get(conta.depto) ?? 0) + conta.oneDriveGb)

  return {
    quotaGb,
    totalGb: contas.reduce((soma, c) => soma + c.oneDriveGb, 0),
    totalArquivos: contas.reduce((soma, c) => soma + c.arquivos, 0),
    gbEmContasInativas: contas
      .filter((c) => c.status === 'inativo')
      .reduce((soma, c) => soma + c.oneDriveGb, 0),
    maiores: [...contas]
      .sort((a, b) => b.oneDriveGb - a.oneDriveGb)
      .slice(0, 12)
      .map((c) => ({ nome: c.nome, upn: c.upn, oneDriveGb: c.oneDriveGb, status: c.status })),
    porSetor: [...porSetor.entries()]
      .map(([setor, gb]) => ({ setor, gb }))
      .sort((a, b) => b.gb - a.gb)
      .slice(0, 6),
  }
}
