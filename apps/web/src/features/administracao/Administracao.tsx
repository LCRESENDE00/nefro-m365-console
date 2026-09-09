import { useState } from 'react'
import { Carregando, Erro } from '../../components/Estado'
import { IconeLixeira } from '../../components/icones'
import { useToast } from '../../components/Toast'
import { catalogosRepo, type Catalogos, type TipoCatalogo } from '../../data'
import { useSubtitulo } from '../../layout/pagina'
import { useDados } from '../../lib/dados'
import { useConsulta } from '../../lib/useConsulta'
import estilos from './Administracao.module.css'

type Lista = {
  tipo: TipoCatalogo
  titulo: string
  descricao: string
  campo: keyof Catalogos
  exemplo: string
}

const LISTAS: Lista[] = [
  {
    tipo: 'setor',
    titulo: 'Setores',
    descricao: 'Aparecem no cadastro e no filtro de setor da tela de Usuários.',
    campo: 'setores',
    exemplo: 'Ex.: Hemodiálise',
  },
  {
    tipo: 'unidade',
    titulo: 'Unidades',
    descricao: 'Cada endereço da rede. Uma conta pertence a uma unidade.',
    campo: 'unidades',
    exemplo: 'Ex.: Unidade Campinas',
  },
  {
    tipo: 'cnpj',
    titulo: 'CNPJs',
    descricao: 'CNPJ ao qual a licença da conta é faturada.',
    campo: 'cnpjs',
    exemplo: 'Ex.: 12.345.678/0005-14',
  },
]

/**
 * Área administrativa: mantém as listas padronizadas que o cadastro consome.
 *
 * Padronizar aqui é o que impede o mesmo setor de existir como "TI", "T.I." e
 * "Tecnologia" — e o que faz os filtros e relatórios fecharem.
 */
export function Administracao() {
  const { versao, invalidar } = useDados()
  const toast = useToast()
  const [novos, setNovos] = useState<Record<string, string>>({})
  const { dados, carregando, erro, recarregar } = useConsulta(() => catalogosRepo.ler(), [versao])

  useSubtitulo('Listas padronizadas usadas no cadastro de contas')

  async function incluir(lista: Lista) {
    const valor = (novos[lista.tipo] ?? '').trim()
    if (!valor) return
    try {
      await catalogosRepo.incluir(lista.tipo, valor)
      setNovos((atual) => ({ ...atual, [lista.tipo]: '' }))
      invalidar()
      toast(`"${valor}" incluído em ${lista.titulo}`)
    } catch (falha) {
      toast((falha as Error).message)
    }
  }

  async function remover(lista: Lista, valor: string) {
    if (!window.confirm(`Remover "${valor}" de ${lista.titulo}?`)) return
    try {
      await catalogosRepo.remover(lista.tipo, valor)
      invalidar()
      toast(`"${valor}" removido`)
    } catch (falha) {
      toast((falha as Error).message)
    }
  }

  if (erro) return <Erro mensagem={erro} aoTentarNovamente={recarregar} />
  if (carregando || !dados) return <Carregando />

  return (
    <div className="grid g3">
      {LISTAS.map((lista) => {
        const valores = dados[lista.campo]
        return (
          <div className="card" key={lista.tipo}>
            <div className="card-h">
              <h3>{lista.titulo}</h3>
              <span className="muted" style={{ fontSize: 12.5, marginLeft: 'auto' }}>
                {valores.length}
              </span>
            </div>
            <p className="muted" style={{ fontSize: 12.5, margin: '0 0 14px' }}>
              {lista.descricao}
            </p>

            <form
              className={estilos.incluir}
              onSubmit={(evento) => {
                evento.preventDefault()
                void incluir(lista)
              }}
            >
              <input
                placeholder={lista.exemplo}
                value={novos[lista.tipo] ?? ''}
                onChange={(e) => setNovos((atual) => ({ ...atual, [lista.tipo]: e.target.value }))}
              />
              <button className="btn" type="submit">
                Incluir
              </button>
            </form>

            {valores.length === 0 ? (
              <p className="muted" style={{ fontSize: 12.5 }}>
                Nenhum valor cadastrado.
              </p>
            ) : (
              <ul className={estilos.lista}>
                {valores.map((valor) => (
                  <li key={valor}>
                    <span className={lista.tipo === 'cnpj' ? 'mono' : ''}>{valor}</span>
                    <button
                      title={`Remover ${valor}`}
                      aria-label={`Remover ${valor}`}
                      onClick={() => void remover(lista, valor)}
                    >
                      <IconeLixeira />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}

      <p className={`muted ${estilos.nota}`}>
        Um valor só sai da lista quando nenhuma conta o usa. Altere os cadastros afetados antes de
        removê-lo.
      </p>
    </div>
  )
}
