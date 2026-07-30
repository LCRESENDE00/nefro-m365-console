/**
 * Contratos da camada de dados.
 *
 * Nenhuma tela importa `fetch` nem conhece a URL da API: tudo passa por estas
 * interfaces. Trocar a implementacao HTTP por outra (Microsoft Graph direto,
 * cache local, mock de teste) nao encosta em nenhum componente.
 */
import type {
  CatalogoRelatorios,
  Configuracoes,
  ContaDetalhada,
  FiltroContas,
  PaginaContas,
  ResumoArmazenamento,
  ResumoLicencas,
  VisaoGeral,
} from './tipos'

export interface ContaRepository {
  listar(filtro: FiltroContas): Promise<PaginaContas>
  buscarPorUpn(upn: string): Promise<ContaDetalhada>
  alternarRevisao(upn: string): Promise<{ marcada: boolean }>
}

export interface MetricasRepository {
  visaoGeral(): Promise<VisaoGeral>
}

export interface LicencaRepository {
  resumo(): Promise<ResumoLicencas>
}

export interface ArmazenamentoRepository {
  resumo(): Promise<ResumoArmazenamento>
}

/** Um arquivo pronto para download, ja com o nome que o backend definiu. */
export type ArquivoGerado = { nome: string; conteudo: Blob }

export interface RelatorioRepository {
  catalogo(): Promise<CatalogoRelatorios>
  gerar(tipo: string): Promise<ArquivoGerado>
  exportarSelecao(upns: string[]): Promise<ArquivoGerado>
}

export interface ConfiguracaoRepository {
  ler(): Promise<Configuracoes>
  salvar(mudancas: Partial<Configuracoes>): Promise<void>
}
