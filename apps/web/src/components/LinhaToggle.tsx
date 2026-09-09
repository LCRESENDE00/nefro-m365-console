type Props = {
  titulo: string
  descricao: string
  ligado: boolean
  aoAlternar: (valor: boolean) => void
}

/** Linha de preferencia com switch, usada em Relatorios e Configuracoes. */
export function LinhaToggle({ titulo, descricao, ligado, aoAlternar }: Props) {
  return (
    <div className="set-row">
      <div className="txt">
        <b>{titulo}</b>
        <span>{descricao}</span>
      </div>
      <button
        className={`switch ${ligado ? 'on' : ''}`}
        role="switch"
        aria-checked={ligado}
        aria-label={titulo}
        onClick={() => aoAlternar(!ligado)}
      >
        <i />
      </button>
    </div>
  )
}
