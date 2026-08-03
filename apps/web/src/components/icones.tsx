/** Icones inline (stroke currentColor) usados na navegacao e nos cartoes. */

const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7 } as const

export const IconeVisaoGeral = () => (
  <svg {...base}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
)

export const IconeUsuarios = () => (
  <svg {...base}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
    <path d="M16 11.2A3 3 0 0 0 16 5.3" />
    <path d="M18.5 20c0-2.4-1-4.2-2.5-5" />
  </svg>
)

export const IconeLicencas = () => (
  <svg {...base}>
    <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
    <path d="M2.5 10h19" />
    <path d="M6.5 14.5h4" />
  </svg>
)

export const IconeArmazenamento = () => (
  <svg {...base}>
    <ellipse cx="12" cy="6" rx="8" ry="3" />
    <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
    <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
  </svg>
)

export const IconeRelatorios = () => (
  <svg {...base}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6M9 17h4" />
  </svg>
)

export const IconeConfiguracoes = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
  </svg>
)

export const IconeAdministracao = () => (
  <svg {...base}>
    <path d="M3.5 20V9.5l6-4 6 4V20" />
    <path d="M2 20h20" />
    <path d="M15.5 20v-7.5l5 2.5V20" />
    <path d="M8 20v-4h3v4" />
  </svg>
)

export const IconeNovaConta = () => (
  <svg {...base} width="15" height="15" strokeWidth={1.8}>
    <circle cx="9.5" cy="8" r="3.4" />
    <path d="M3 20c0-3.4 2.9-5.6 6.5-5.6 1 0 2 .2 2.8.5" />
    <path d="M18 14v6M15 17h6" />
  </svg>
)

export const IconeEditar = () => (
  <svg {...base} width="15" height="15" strokeWidth={1.8}>
    <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
    <path d="M14.5 6.5l3 3" />
  </svg>
)

export const IconeChave = () => (
  <svg {...base} width="15" height="15" strokeWidth={1.8}>
    <circle cx="8" cy="8" r="4.2" />
    <path d="m11 11 8 8" />
    <path d="m16.5 16.5 2-2M19 19l2-2" />
  </svg>
)

export const IconeInativar = () => (
  <svg {...base} width="15" height="15" strokeWidth={1.8}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m6.5 6.5 11 11" />
  </svg>
)

export const IconeLixeira = () => (
  <svg {...base} width="15" height="15" strokeWidth={1.8}>
    <path d="M4 6.5h16" />
    <path d="M9.5 6.5V4.8h5v1.7" />
    <path d="M6 6.5 7 20h10l1-13.5" />
  </svg>
)

export const IconeExportar = () => (
  <svg {...base} width="15" height="15" strokeWidth={1.8}>
    <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </svg>
)

export const IconeBusca = () => (
  <svg {...base} strokeWidth={1.8}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

export const IconeMicrosoft = () => (
  <svg width="15" height="15" viewBox="0 0 23 23" aria-hidden="true">
    <path fill="#fff" d="M1 1h10v10H1z" opacity=".9" />
    <path fill="#fff" d="M12 1h10v10H12z" opacity=".65" />
    <path fill="#fff" d="M1 12h10v10H1z" opacity=".65" />
    <path fill="#fff" d="M12 12h10v10H12z" opacity=".45" />
  </svg>
)
