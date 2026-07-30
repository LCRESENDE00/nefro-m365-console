/** Implementacao HTTP dos repositorios, falando com a API Express local. */
import type {
  ArmazenamentoRepository,
  ConfiguracaoRepository,
  ContaRepository,
  LicencaRepository,
  MetricasRepository,
  RelatorioRepository,
} from '../repositorios'
import type {
  CatalogoRelatorios,
  Configuracoes,
  ContaDetalhada,
  PaginaContas,
  ResumoArmazenamento,
  ResumoLicencas,
  VisaoGeral,
} from '../tipos'
import { baixarArquivo, enviarJson, montarQuery, pegarJson } from './cliente'

export const contasHttp: ContaRepository = {
  listar: (filtro) =>
    pegarJson<PaginaContas>(
      `/usuarios${montarQuery({
        q: filtro.q,
        depto: filtro.depto,
        status: filtro.status,
        sort: filtro.sort,
        dir: filtro.dir,
      })}`,
    ),
  buscarPorUpn: (upn) => pegarJson<ContaDetalhada>(`/usuarios/${encodeURIComponent(upn)}`),
  alternarRevisao: (upn) =>
    enviarJson<{ marcada: boolean }>(`/usuarios/${encodeURIComponent(upn)}/revisao`, 'POST'),
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
