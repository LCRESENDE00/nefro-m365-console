/** Implementacao HTTP dos repositorios, falando com a API Express local. */
import type {
  ArmazenamentoRepository,
  CatalogoRepository,
  ConfiguracaoRepository,
  ContaRepository,
  LicencaRepository,
  MetricasRepository,
  RelatorioRepository,
} from '../repositorios'
import type {
  CatalogoRelatorios,
  Catalogos,
  Configuracoes,
  ContaDetalhada,
  PaginaContas,
  ResumoArmazenamento,
  ResumoLicencas,
  VisaoGeral,
} from '../tipos'
import { baixarArquivo, enviarJson, montarQuery, pegarJson } from './cliente'

const caminhoConta = (upn: string) => `/usuarios/${encodeURIComponent(upn)}`

export const contasHttp: ContaRepository = {
  listar: (filtro) =>
    pegarJson<PaginaContas>(
      `/usuarios${montarQuery({
        q: filtro.q,
        depto: filtro.depto,
        unidade: filtro.unidade,
        tipoLicenca: filtro.tipoLicenca,
        classificacao: filtro.classificacao,
        regime: filtro.regime,
        produto: filtro.produto,
        status: filtro.status,
        sort: filtro.sort,
        dir: filtro.dir,
      })}`,
    ),
  buscarPorUpn: (upn) => pegarJson<ContaDetalhada>(caminhoConta(upn)),
  criar: (cadastro) => enviarJson<{ upn: string }>('/usuarios', 'POST', cadastro),
  atualizar: async (upn, mudancas) => {
    await enviarJson(caminhoConta(upn), 'PATCH', mudancas)
  },
  redefinirSenha: (upn) => enviarJson<{ senha: string }>(`${caminhoConta(upn)}/senha`, 'POST'),
  alternarSituacao: (upn) =>
    enviarJson<{ habilitada: boolean }>(`${caminhoConta(upn)}/situacao`, 'POST'),
  alternarRevisao: (upn) => enviarJson<{ marcada: boolean }>(`${caminhoConta(upn)}/revisao`, 'POST'),
}

export const catalogosHttp: CatalogoRepository = {
  ler: () => pegarJson<Catalogos>('/catalogos'),
  incluir: (tipo, valor) => enviarJson<Catalogos>('/catalogos', 'POST', { tipo, valor }),
  remover: (tipo, valor) =>
    enviarJson<Catalogos>(`/catalogos/${tipo}/${encodeURIComponent(valor)}`, 'DELETE'),
}

export const metricasHttp: MetricasRepository = {
  visaoGeral: () => pegarJson<VisaoGeral>('/metricas/visao-geral'),
}

export const licencasHttp: LicencaRepository = {
  resumo: () => pegarJson<ResumoLicencas>('/licencas'),
}

export const armazenamentoHttp: ArmazenamentoRepository = {
  resumo: () => pegarJson<ResumoArmazenamento>('/armazenamento'),
}

export const relatoriosHttp: RelatorioRepository = {
  catalogo: () => pegarJson<CatalogoRelatorios>('/relatorios'),
  gerar: (tipo) => baixarArquivo(`/relatorios/${tipo}`),
  exportarSelecao: (upns) => baixarArquivo('/relatorios/selecao/usuarios', { upns }),
}

export const configuracoesHttp: ConfiguracaoRepository = {
  ler: () => pegarJson<Configuracoes>('/configuracoes'),
  salvar: async (mudancas) => {
    await enviarJson('/configuracoes', 'PATCH', mudancas)
  },
}
