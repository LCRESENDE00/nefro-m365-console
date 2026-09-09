import { useId } from 'react'

type Props = {
  dados: number[]
  cor?: string
  altura?: number
}

/** Area chart em SVG puro: evita uma dependencia de grafico so por isso. */
export function AreaChart({ dados, cor = '#5B8CFF', altura = 140 }: Props) {
  const gradiente = useId()
  if (dados.length < 2) return null

  const largura = 560
  const maximo = Math.max(...dados) * 1.15 || 1
  const x = (i: number) => i * (largura / (dados.length - 1))
  const y = (valor: number) => altura - (valor / maximo) * altura

  const linha = dados.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const area = `${linha} L${largura},${altura} L0,${altura} Z`

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${largura} ${altura + 22}`}
      preserveAspectRatio="none"
      style={{ height: altura + 22 }}
      role="img"
      aria-label="Série de acessos por semana"
    >
      <defs>
        <linearGradient id={gradiente} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={cor} stopOpacity=".28" />
          <stop offset="100%" stopColor={cor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((p) => (
        <line key={p} className="gl" x1="0" y1={altura * p} x2={largura} y2={altura * p} />
      ))}
      <path d={area} fill={`url(#${gradiente})`} />
      <path d={linha} fill="none" stroke={cor} strokeWidth="2" strokeLinejoin="round" />
      {dados.map((v, i) =>
        i % 3 === 0 ? <circle key={i} cx={x(i)} cy={y(v)} r="2.5" fill={cor} /> : null,
      )}
    </svg>
  )
}
