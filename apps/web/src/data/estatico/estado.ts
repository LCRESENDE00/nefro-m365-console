import {
  CNPJS,
  CONFIGURACOES_PADRAO,
  EXPORTACOES_INICIAIS,
  SETORES,
  UNIDADES,
  type UsuarioSeed,
} from '@nefro/dominio'
import type { Catalogos, Exportacao } from '../tipos'

/**
 * Estado mutavel da demo estatica.
 *
 * Sem backend nao ha onde gravar, entao o que a interface altera (preferencias,
 * historico de exportacoes, contas marcadas) fica no localStorage do visitante.
 * Some ao limpar o navegador e nao e compartilhado entre pessoas.
 */

const CHAVE = 'console-m365:demo'

export type EstadoDemo = {
  preferencias: Record<string, string>
  historico: Exportacao[]
  marcadas: string[]
  /** `null` enquanto ninguem criou nem editou conta: vale o seed original. */
  contas: UsuarioSeed[] | null
  catalogos: Catalogos
}

function estadoInicial(): EstadoDemo {
  return {
    preferencias: Object.fromEntries(CONFIGURACOES_PADRAO.map((c) => [c.chave, c.valor])),
    historico: EXPORTACOES_INICIAIS.map((e, i) => ({ id: i + 1, ...e })),
    marcadas: [],
    contas: null,
    catalogos: { setores: [...SETORES], unidades: [...UNIDADES], cnpjs: [...CNPJS] },
  }
}

let estado: EstadoDemo = carregar()

function carregar(): EstadoDemo {
  const base = estadoInicial()
  try {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) return base
    const salvo = JSON.parse(bruto) as Partial<EstadoDemo>
    return {
      // Mescla com o padrao para que chaves novas apareçam em visitantes antigos.
      preferencias: { ...base.preferencias, ...(salvo.preferencias ?? {}) },
      historico: salvo.historico ?? base.historico,
      marcadas: salvo.marcadas ?? base.marcadas,
      contas: salvo.contas ?? base.contas,
      catalogos: salvo.catalogos ?? base.catalogos,
    }
  } catch {
    return base
  }
}

export function lerEstado(): EstadoDemo {
  return estado
}

export function atualizarEstado(mudanca: Partial<EstadoDemo>) {
  estado = { ...estado, ...mudanca }
  try {
    localStorage.setItem(CHAVE, JSON.stringify(estado))
  } catch {
    // Modo privativo ou storage cheio: a demo segue funcionando em memoria.
  }
}

/** Limiares ja convertidos, com a mesma protecao que a API aplica. */
export function limiares() {
  const { preferencias } = estado
  const limiarOcioso = Number(preferencias.limiarOcioso ?? 30)
  return {
    limiarOcioso,
    limiarInativo: Math.max(Number(preferencias.limiarInativo ?? 90), limiarOcioso),
    incluirRecursos: (preferencias.incluirRecursos ?? 'true') === 'true',
  }
}
