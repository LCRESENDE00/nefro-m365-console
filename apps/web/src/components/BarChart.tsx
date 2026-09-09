type Barra = { rotulo: string; valor: number; cor: string }

export function BarChart({ barras, altura = 150 }: { barras: Barra[]; altura?: number }) {
  const maximo = Math.max(...barras.map((b) => b.valor)) || 1

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: altura, paddingTop: 8 }}>
      {barras.map((barra) => (
        <div
          key={barra.rotulo}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            height: '100%',
            justifyContent: 'flex-end',
          }}
        >
          <span className="mono" style={{ fontSize: 12, color: 'var(--text-2)' }}>
            {barra.valor}
          </span>
          <div
            style={{
              width: '100%',
              height: `${((barra.valor / maximo) * 100).toFixed(0)}%`,
              minHeight: 4,
              background: barra.cor,
              borderRadius: '6px 6px 3px 3px',
              opacity: 0.9,
            }}
          />
          <span style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center', lineHeight: 1.25 }}>
            {barra.rotulo}
          </span>
        </div>
      ))}
    </div>
  )
}
