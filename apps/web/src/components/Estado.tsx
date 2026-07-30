/** Placeholders de carregamento e erro usados por todas as telas. */

export function Carregando({ texto = 'Consultando o banco…' }: { texto?: string }) {
  return (
    <div className="card muted" style={{ padding: 44, textAlign: 'center', fontSize: 13.5 }}>
      {texto}
    </div>
  )
}

export function Erro({ mensagem, aoTentarNovamente }: { mensagem: string; aoTentarNovamente?: () => void }) {
  return (
    <div className="card" style={{ padding: 32, textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--display)', fontSize: 15, marginBottom: 6 }}>
        Não foi possível carregar os dados
      </div>
      <div className="muted" style={{ fontSize: 13, marginBottom: 16 }}>
        {mensagem}. Confira se a API está no ar em <span className="mono">localhost:3333</span>.
      </div>
      {aoTentarNovamente && (
        <button className="btn" onClick={aoTentarNovamente}>
          Tentar de novo
        </button>
      )}
    </div>
  )
}
