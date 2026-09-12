import { useState } from 'react'
import { useToast } from '../../components/Toast'
import { normalizarSigla, regioesDoCatalogo, useCatalogos, type Unidade } from '../../lib/catalogos'
import estilos from './UnidadesSetores.module.css'

const NOVA_UNIDADE: Unidade = { sigla: '', nome: '', regiao: '' }

/**
 * Card de Configurações que mantém as listas de unidades e setores usadas nas listas
 * suspensas do cadastro (Nova conta) e nos filtros de Usuários.
 */
export function UnidadesSetores() {
  const toast = useToast()
  const { catalogos, salvarUnidade, removerUnidade, adicionarSetor, removerSetor, restaurarCatalogosPadrao, definirCatalogos } =
    useCatalogos()
  const [novaUnidade, setNovaUnidade] = useState<Unidade>(NOVA_UNIDADE)
  const [novoSetor, setNovoSetor] = useState('')
  const regioes = regioesDoCatalogo()

  const siglaNova = normalizarSigla(novaUnidade.sigla)
  const siglaRepetida = catalogos.unidades.some((u) => u.sigla === siglaNova)

  function adicionarUnidade() {
    if (!siglaNova || siglaRepetida) return
    salvarUnidade({ ...novaUnidade, sigla: siglaNova })
    toast(`Unidade ${siglaNova} adicionada`)
    setNovaUnidade(NOVA_UNIDADE)
  }

  function incluirSetor() {
    const limpo = novoSetor.trim()
    if (!limpo) return
    adicionarSetor(limpo)
    toast(`Setor ${limpo} adicionado`)
    setNovoSetor('')
  }

  async function copiarLista() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(catalogos, null, 2))
      toast('Lista copiada — cole em "Colar lista" no outro navegador')
    } catch {
      toast('Não deu para copiar automaticamente.')
    }
  }

  function colarLista() {
    const texto = window.prompt('Cole aqui a lista copiada de outro navegador:')
    if (!texto) return
    try {
      const dados = JSON.parse(texto)
      if (!Array.isArray(dados.unidades) || !Array.isArray(dados.setores)) throw new Error('formato')
      definirCatalogos({ unidades: dados.unidades, setores: dados.setores })
      toast('Lista importada')
    } catch {
      toast('Esse texto não é uma lista válida do NefroControl.')
    }
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-h">
        <h3>Unidades e setores</h3>
        <span className="muted" style={{ fontSize: 12.5, marginLeft: 'auto' }}>
          {catalogos.unidades.length} unidades · {catalogos.setores.length} setores
        </span>
      </div>
      <p className="muted" style={{ fontSize: 12.8, margin: '0 0 14px' }}>
        São as listas suspensas do cadastro de conta e dos filtros de Usuários: quem cadastra escolhe daqui, então a
        sigla e o nome saem sempre iguais. A sigla da unidade é o que vai para o campo <span className="mono">department</span>{' '}
        do Entra. O endereço de cada unidade entra na assinatura de e-mail gerada para quem é dela. A lista fica salva
        neste navegador — use "Copiar lista" / "Colar lista" para levar para outro.
      </p>

      <div className={estilos.secao}>Unidades</div>
      <div className={estilos.tabela}>
        <div className={`${estilos.linha} ${estilos.cabecalho}`}>
          <span>Sigla (department)</span>
          <span>Nome</span>
          <span>Região</span>
          <span />
        </div>
        {catalogos.unidades.map((unidade) => (
          <div key={unidade.sigla} className={estilos.linha}>
            <b className="mono">{unidade.sigla}</b>
            <input
              value={unidade.nome}
              placeholder="Nome da unidade"
              onChange={(e) => salvarUnidade({ ...unidade, nome: e.target.value })}
            />
            <input
              list="regioes-catalogo"
              value={unidade.regiao}
              placeholder="Região"
              onChange={(e) => salvarUnidade({ ...unidade, regiao: e.target.value })}
            />
            <button
              className={estilos.remover}
              title={`Remover ${unidade.sigla}`}
              aria-label={`Remover ${unidade.sigla}`}
              onClick={() => {
                removerUnidade(unidade.sigla)
                toast(`Unidade ${unidade.sigla} removida`)
              }}
            >
              ×
            </button>
            <textarea
              className={estilos.endereco}
              rows={2}
              value={unidade.endereco ?? ''}
              placeholder="Endereço para a assinatura de e-mail (uma linha por quebra; vazio = sem endereço)"
              aria-label={`Endereço da unidade ${unidade.sigla} na assinatura de e-mail`}
              onChange={(e) => salvarUnidade({ ...unidade, endereco: e.target.value })}
            />
          </div>
        ))}
        <div className={`${estilos.linha} ${estilos.nova}`}>
          <input
            value={novaUnidade.sigla}
            placeholder="Ex.: NCBHZ"
            aria-invalid={siglaRepetida}
            onChange={(e) => setNovaUnidade((u) => ({ ...u, sigla: e.target.value.toUpperCase() }))}
            onKeyDown={(e) => e.key === 'Enter' && adicionarUnidade()}
          />
          <input
            value={novaUnidade.nome}
            placeholder="Ex.: Belo Horizonte"
            onChange={(e) => setNovaUnidade((u) => ({ ...u, nome: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && adicionarUnidade()}
          />
          <input
            list="regioes-catalogo"
            value={novaUnidade.regiao}
            placeholder="Ex.: Minas Gerais"
            onChange={(e) => setNovaUnidade((u) => ({ ...u, regiao: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && adicionarUnidade()}
          />
          <button className="btn btn-primary" onClick={adicionarUnidade} disabled={!siglaNova || siglaRepetida}>
            Adicionar
          </button>
        </div>
        {siglaRepetida && <p className={estilos.erro}>Essa sigla já está na lista.</p>}
      </div>
      <datalist id="regioes-catalogo">
        {regioes.map((regiao) => (
          <option key={regiao} value={regiao} />
        ))}
      </datalist>

      <div className={estilos.secao}>Setores</div>
      <div className={estilos.chips}>
        {catalogos.setores.map((setor) => (
          <span key={setor} className={estilos.chip}>
            {setor}
            <button
              title={`Remover ${setor}`}
              aria-label={`Remover ${setor}`}
              onClick={() => {
                removerSetor(setor)
                toast(`Setor ${setor} removido`)
              }}
            >
              ×
            </button>
          </span>
        ))}
        {catalogos.setores.length === 0 && <span className="muted">Nenhum setor cadastrado.</span>}
      </div>
      <div className={estilos.novoSetor}>
        <input
          value={novoSetor}
          placeholder="Ex.: Hemodiálise"
          onChange={(e) => setNovoSetor(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && incluirSetor()}
        />
        <button className="btn btn-primary" onClick={incluirSetor} disabled={!novoSetor.trim()}>
          Adicionar setor
        </button>
      </div>

      <div className={estilos.acoes}>
        <button className="btn" onClick={() => void copiarLista()}>
          Copiar lista
        </button>
        <button className="btn" onClick={colarLista}>
          Colar lista
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => {
            if (window.confirm('Voltar unidades e setores para a lista padrão do console? O que você editou aqui se perde.')) {
              restaurarCatalogosPadrao()
              toast('Listas restauradas para o padrão')
            }
          }}
        >
          Restaurar padrão
        </button>
      </div>
    </div>
  )
}
