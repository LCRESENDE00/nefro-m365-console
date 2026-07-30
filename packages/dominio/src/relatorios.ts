/** Definicao das planilhas exportaveis, usada pela API e pela demo estatica. */
import type { SkuSeed } from './dados.js'
import { quando } from './dominio.js'
import type { ContaCalculada, Planilha, StatusConta } from './tipos.js'

const ROTULO_STATUS: Record<StatusConta, string> = {
  ativo: 'Ativo',
  ocioso: 'Ocioso',
  inativo: 'Inativo',
  nunca: 'Nunca acessou',
}

const numero = (valor: number) => valor.toFixed(2).replace('.', ',')

export type DefinicaoRelatorio = {
  titulo: string
  montar: (contas: ContaCalculada[], skus: SkuSeed[]) => Planilha
}

export const RELATORIOS: Record<string, DefinicaoRelatorio> = {
  'usuarios-inativos': {
    titulo: 'Contas sem acesso',
    montar: (contas) => ({
      cabecalho: ['Nome', 'Conta', 'Cargo', 'Setor', 'Licença', 'Último acesso', 'Dias', 'Status', 'Custo mensal (R$)'],
      linhas: [...contas]
        .sort((a, b) => (b.diasUltimoAcesso ?? 9999) - (a.diasUltimoAcesso ?? 9999))
        .map((c) => [
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
    }),
  },

  licencas: {
    titulo: 'Inventário de licenças',
    montar: (contas, skus) => ({
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
    }),
  },

  onedrive: {
    titulo: 'Uso do OneDrive',
    montar: (contas) => ({
      cabecalho: ['Nome', 'Conta', 'Setor', 'Espaço (GB)', 'Arquivos', 'Status'],
      linhas: [...contas]
        .sort((a, b) => b.oneDriveGb - a.oneDriveGb)
        .map((c) => [c.nome, c.upn, c.depto, numero(c.oneDriveGb), c.arquivos, ROTULO_STATUS[c.status]]),
    }),
  },

  mfa: {
    titulo: 'Segurança das contas',
    // Pendencias primeiro, como diz a descricao do relatorio na tela.
    montar: (contas) => ({
      cabecalho: ['Nome', 'Conta', 'Setor', 'MFA', 'Último acesso', 'Status'],
      linhas: contas
        .filter((c) => !c.ehRecurso)
        .sort((a, b) => Number(a.mfa) - Number(b.mfa) || a.depto.localeCompare(b.depto, 'pt-BR'))
        .map((c) => [
          c.nome,
          c.upn,
          c.depto,
          c.mfa ? 'configurado' : 'PENDENTE',
          quando(c.diasUltimoAcesso),
          ROTULO_STATUS[c.status],
        ]),
    }),
  },
}

/** Exporta exatamente a selecao visivel na tela de Usuarios. */
export function planilhaSelecao(contas: ContaCalculada[]): Planilha {
  return {
    cabecalho: ['Nome', 'Conta', 'Cargo', 'Setor', 'Licença', 'Último acesso', 'MFA', 'OneDrive (GB)', 'Status', 'Custo mensal (R$)'],
    linhas: contas.map((c) => [
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
  }
}
