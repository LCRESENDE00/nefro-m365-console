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
  senhaTemporaria,
  serieDoUsuario,
  statusConta,
  validarCadastro,
  type ContaCalculada,
  type Planilha,
  type UsuarioSeed,
} from '@nefro/dominio'
import type {
  ArmazenamentoRepository,
  ArquivoGerado,
  CatalogoRepository,
  ConfiguracaoRepository,
  ContaRepository,
  LicencaRepository,
  MetricasRepository,
  RelatorioRepository,
} from '../repositorios'
import { atualizarEstado, lerEstado, limiares } from './estado'

const PERMISSOES = [
  'User.ReadWrite.All',
  'Directory.ReadWrite.All',
  'UserAuthenticationMethod.ReadWrite.All',
  'Organization.Read.All',
  'Reports.Read.All',
  'AuditLog.Read.All',
]

const SKU_POR_CODIGO = new Map(SKUS.map((sku) => [sku.codigo, sku]))

/** Cadastro vigente: o seed original, ou o que a demo ja alterou no navegador. */
function cadastros(): UsuarioSeed[] {
  return lerEstado().contas ?? USUARIOS
}

/** Grava a lista inteira: sem backend, e o jeito mais simples de nao perder edicao. */
function gravarCadastros(lista: UsuarioSeed[]) {
  atualizarEstado({ contas: lista })
}

function acharCadastro(upn: string): UsuarioSeed {
  const conta = cadastros().find((c) => c.upn === upn)
  if (!conta) throw new Error('Conta não encontrada')
  return conta
}

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

  return cadastros()
    .map((u, indice) => ({ ...u, id: indice + 1 }))
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
        unidade: u.unidade,
        cnpj: u.cnpj,
        diasUltimoAcesso: u.diasUltimoAcesso,
        mfa: u.mfa,
        oneDriveGb: u.oneDriveGb,
        arquivos: u.arquivos,
        ehRecurso: u.ehRecurso,
        habilitada: u.habilitada,
        classificacao: u.classificacao,
        regime: u.regime,
        tipoLicenca: u.tipoLicenca,
        produto: u.produto,
        tipoContrato: u.tipoContrato,
        dataRenovacao: u.dataRenovacao,
        valorTotal: u.valorTotal,
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

  async criar(cadastro) {
    const invalido = validarCadastro(cadastro)
    if (invalido) throw new Error(invalido)

    const lista = cadastros()
    if (lista.some((c) => c.upn === cadastro.upn)) {
      throw new Error('Já existe uma conta com esse e-mail')
    }
    const sku = SKU_POR_CODIGO.get(cadastro.skuCodigo)
    if (!sku) throw new Error('Tipo de licença desconhecido')

    gravarCadastros([
      ...lista,
      {
        ...cadastro,
        // Conta recem-criada ainda nao registrou login.
        diasUltimoAcesso: null,
        oneDriveGb: 0,
        arquivos: 0,
        habilitada: true,
        valorTotal: cadastro.valorTotal || sku.preco,
      },
    ])

    return { upn: cadastro.upn }
  },

  async atualizar(upn, mudancas) {
    const invalido = validarCadastro(mudancas, true)
    if (invalido) throw new Error(invalido)

    acharCadastro(upn)
    if (mudancas.skuCodigo && !SKU_POR_CODIGO.has(mudancas.skuCodigo)) {
      throw new Error('Tipo de licença desconhecido')
    }

    gravarCadastros(
      cadastros().map((c) => (c.upn === upn ? { ...c, ...mudancas, upn: c.upn } : c)),
    )
  },

  async redefinirSenha(upn) {
    acharCadastro(upn)
    return { senha: senhaTemporaria() }
  },

  async alternarSituacao(upn) {
    const habilitada = !acharCadastro(upn).habilitada
    gravarCadastros(cadastros().map((c) => (c.upn === upn ? { ...c, habilitada } : c)))
    return { habilitada }
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

const LISTA_DO_TIPO = { setor: 'setores', unidade: 'unidades', cnpj: 'cnpjs' } as const

export const catalogosEstatico: CatalogoRepository = {
  async ler() {
    return lerEstado().catalogos
  },

  async incluir(tipo, valor) {
    const texto = valor.trim()
    if (!texto) throw new Error('Informe o valor a incluir')

    const { catalogos } = lerEstado()
    const lista = LISTA_DO_TIPO[tipo]
    if (catalogos[lista].includes(texto)) throw new Error('Esse valor já está na lista')

    const novos = {
      ...catalogos,
      [lista]: [...catalogos[lista], texto].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    }
    atualizarEstado({ catalogos: novos })
    return novos
  },

  async remover(tipo, valor) {
    const campo = tipo === 'setor' ? 'depto' : tipo === 'unidade' ? 'unidade' : 'cnpj'
    const emUso = cadastros().filter((c) => c[campo] === valor).length
    if (emUso > 0) {
      throw new Error(
        `${emUso} ${emUso === 1 ? 'conta usa' : 'contas usam'} esse valor. Altere os cadastros antes de remover.`,
      )
    }

    const { catalogos } = lerEstado()
    const lista = LISTA_DO_TIPO[tipo]
    const novos = { ...catalogos, [lista]: catalogos[lista].filter((v) => v !== valor) }
    atualizarEstado({ catalogos: novos })
    return novos
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
