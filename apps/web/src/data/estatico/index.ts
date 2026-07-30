/**
 * Implementacao dos repositorios sem backend, para a demo publicada no
 * GitHub Pages. Le o mesmo seed e chama as mesmas funcoes de calculo que a API
 * usa, entao os numeros batem com os da versao completa.
 */
import {
  RELATORIOS,
  SERIE_TENANT,
  SKUS,
  USUARIOS,
  calcularArmazenamento,
  calcularLicencas,
  calcularVisaoGeral,
  dataArquivo,
  filtrarContas,
  paraCsv,
  planilhaSelecao,
  serieDoUsuario,
  statusConta,
  type ContaCalculada,
  type Planilha,
} from '@nefro/dominio'
import type {
  ArmazenamentoRepository,
  ArquivoGerado,
  ConfiguracaoRepository,
  ContaRepository,
  LicencaRepository,
  MetricasRepository,
  RelatorioRepository,
} from '../repositorios'
import { atualizarEstado, lerEstado, limiares } from './estado'

const PERMISSOES = [
  'User.Read.All',
  'Directory.Read.All',
  'Organization.Read.All',
  'Reports.Read.All',
  'AuditLog.Read.All',
]

const SKU_POR_CODIGO = new Map(SKUS.map((sku) => [sku.codigo, sku]))

/**
 * Mesmo papel de `listarContas()` na API: seed + status resolvido.
 *
 * A ordem tem que ser a mesma do banco, senao empates (contas sem acesso) caem
 * em posicoes diferentes e ate as somas de ponto flutuante divergem. Por isso o
 * id vem da posicao no seed (equivale ao autoincrement) e a ordenacao por nome
 * usa comparacao de code unit, que e o que o SQLite faz com a collation padrao.
 */
function contas(): ContaCalculada[] {
  const atual = limiares()

  return USUARIOS.map((u, indice) => ({ ...u, id: indice + 1 }))
    .filter((u) => atual.incluirRecursos || !u.ehRecurso)
    .sort((a, b) => (a.nome > b.nome ? 1 : a.nome < b.nome ? -1 : 0))
    .map((u) => {
      const sku = SKU_POR_CODIGO.get(u.skuCodigo)!
      return {
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
        status: statusConta(u.diasUltimoAcesso, atual),
        sku: { codigo: sku.codigo, nome: sku.nome, curto: sku.curto, preco: sku.preco, cor: sku.cor },
      }
    })
}

/** Monta o arquivo no navegador e registra no historico da demo. */
function gerarCsv(nomeBase: string, planilha: Planilha): ArquivoGerado {
  const { preferencias, historico } = lerEstado()
  const nome = `${nomeBase}-${dataArquivo()}.csv`

  atualizarEstado({
    historico: [
      {
        id: Math.max(0, ...historico.map((h) => h.id)) + 1,
        arquivo: nome,
        geradoPor: preferencias.contaConectada?.split('@')[0]?.replace('.', ' ') ?? 'console',
        linhas: planilha.linhas.length,
        criadoEm: new Date().toISOString(),
      },
      ...historico,
    ],
  })

  return {
    nome,
    conteudo: new Blob([paraCsv(planilha.cabecalho, planilha.linhas)], {
      type: 'text/csv;charset=utf-8',
    }),
  }
}

export const contasEstatico: ContaRepository = {
  async listar(filtro) {
    return filtrarContas(contas(), filtro)
  },

  async buscarPorUpn(upn) {
    const conta = contas().find((c) => c.upn === upn)
    if (!conta) throw new Error('Conta não encontrada')
    return { ...conta, serieAcessos: serieDoUsuario(conta.diasUltimoAcesso) }
  },

  async alternarRevisao(upn) {
    const { marcadas } = lerEstado()
    const jaMarcada = marcadas.includes(upn)
    atualizarEstado({ marcadas: jaMarcada ? marcadas.filter((m) => m !== upn) : [...marcadas, upn] })
    return { marcada: !jaMarcada }
  },
}

export const metricasEstatico: MetricasRepository = {
  async visaoGeral() {
    return calcularVisaoGeral(contas(), limiares(), SERIE_TENANT)
  },
}

export const licencasEstatico: LicencaRepository = {
  async resumo() {
    return calcularLicencas(contas(), SKUS)
  },
}

export const armazenamentoEstatico: ArmazenamentoRepository = {
  async resumo() {
    const { preferencias } = lerEstado()
    return calcularArmazenamento(contas(), Number(preferencias.quotaTenantGb ?? 1024))
  },
}

export const relatoriosEstatico: RelatorioRepository = {
  async catalogo() {
    const { preferencias, historico } = lerEstado()
    return {
      disponiveis: Object.entries(RELATORIOS).map(([tipo, r]) => ({ tipo, titulo: r.titulo })),
      historico: historico.slice(0, 12),
      envioAutomatico: {
        resumoMensal: preferencias.resumoMensal === 'true',
        alertaContaInativa: preferencias.alertaContaInativa === 'true',
        copiaPastaTI: preferencias.copiaPastaTI === 'true',
        destinatario: preferencias.contaConectada ?? '',
      },
    }
  },

  async gerar(tipo) {
    const relatorio = RELATORIOS[tipo]
    if (!relatorio) throw new Error('Relatório desconhecido')
    return gerarCsv(tipo, relatorio.montar(contas(), SKUS))
  },

  async exportarSelecao(upns) {
    return gerarCsv('usuarios-filtrados', planilhaSelecao(contas().filter((c) => upns.includes(c.upn))))
  },
}

export const configuracoesEstatico: ConfiguracaoRepository = {
  async ler() {
    const { preferencias, marcadas } = lerEstado()
    const atual = limiares()
    return {
      tenantId: preferencias.tenantId ?? '',
      clientId: preferencias.clientId ?? '',
      contaConectada: preferencias.contaConectada ?? '',
      limiarOcioso: atual.limiarOcioso,
      limiarInativo: atual.limiarInativo,
      atualizarAoAbrir: preferencias.atualizarAoAbrir === 'true',
      incluirRecursos: preferencias.incluirRecursos === 'true',
      modoDemo: preferencias.modoDemo === 'true',
      resumoMensal: preferencias.resumoMensal === 'true',
      alertaContaInativa: preferencias.alertaContaInativa === 'true',
      copiaPastaTI: preferencias.copiaPastaTI === 'true',
      permissoes: PERMISSOES,
      marcadasParaRevisao: marcadas,
    }
  },

  async salvar(mudancas) {
    const { preferencias } = lerEstado()
    const novas = { ...preferencias }
    for (const [chave, valor] of Object.entries(mudancas)) novas[chave] = String(valor)
    atualizarEstado({ preferencias: novas })
  },
}
