/**
 * Contratos da camada de dados.
 *
 * Nenhuma tela importa `fetch` nem conhece a URL da API: tudo passa por estas
 * interfaces. Trocar a implementacao HTTP por outra (Microsoft Graph direto,
 * cache local, mock de teste) nao encosta em nenhum componente.
 */
import type {
  Cadastro,
  CatalogoRelatorios,
  Catalogos,
  Configuracoes,
  ContaDetalhada,
  FiltroContas,
  PaginaContas,
  ResumoArmazenamento,
  ResumoLicencas,
  TipoCatalogo,
  VisaoGeral,
} from './tipos'

export interface ContaRepository {
  listar(filtro: FiltroContas): Promise<PaginaContas>
  buscarPorUpn(upn: string): Promise<ContaDetalhada>
  criar(cadastro: Cadastro): Promise<{ upn: string }>
  /** O UPN identifica a conta e nao muda: as mudancas cobrem o resto. */
  atualizar(upn: string, mudancas: Partial<Cadastro>): Promise<void>
  /** Devolve a senha temporaria uma unica vez; ela nao fica guardada. */
  redefinirSenha(upn: string): Promise<{ senha: string }>
  /** Inativa a conta, ou reativa se ja estiver inativa. */
  alternarSituacao(upn: string): Promise<{ habilitada: boolean }>
  alternarRevisao(upn: string): Promise<{ marcada: boolean }>
}

/** Listas padronizadas (setores, unidades, CNPJs) mantidas na Administracao. */
export interface CatalogoRepository {
  ler(): Promise<Catalogos>
  incluir(tipo: TipoCatalogo, valor: string): Promise<Catalogos>
  remover(tipo: TipoCatalogo, valor: string): Promise<Catalogos>
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
