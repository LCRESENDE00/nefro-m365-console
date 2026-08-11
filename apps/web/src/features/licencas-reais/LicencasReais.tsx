import { createElement as h, useState } from 'react'
import { entrarELerLicencasReais } from '../../lib/msalClient'

export function LicencasReais() {
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [dados, setDados] = useState<any>(null)

function conectar() {
  setCarregando(true)
  setErro(null)
  entrarELerLicencasReais()
  .then(function (resultado) {
    setDados(resultado)
  })
  .catch(function (e) {
    setErro(e && e.message ? e.message : 'Nao foi possivel conectar com a Microsoft.')
  })
  .finally(function () {
    setCarregando(false)
  })
}

var linhas = dados ? dados.skus.map(function (sku: any) {
  return h('tr', { key: sku.skuId },
           h('td', null, sku.skuPartNumber),
           h('td', { style: { textAlign: 'center' } }, sku.comprados),
           h('td', { style: { textAlign: 'center' } }, sku.emUso),
           h('td', { style: { textAlign: 'center' } }, sku.livres)
           )
}) : []

  return h('div', { className: 'card', style: { padding: 24 } },
           h('h2', null, 'Licencas reais do tenant'),
           h('p', { className: 'muted', style: { fontSize: 13 } }, 'Login real com a Microsoft, sem simulacao. Leitura direta da Microsoft Graph. Somente leitura.'),
           !dados ? h('button', { className: 'btn btn-primary', onClick: conectar, disabled: carregando }, carregando ? 'Conectando...' : 'Conectar com a Microsoft') : null,
           erro ? h('p', { style: { color: 'var(--rose)', marginTop: 12 } }, erro) : null,
           dados ? h('div', { style: { marginTop: 20 } },
                     dados.nome ? h('p', null, 'Logado como ', h('b', null, dados.nome)) : null,
                     h('table', { style: { width: '100%', marginTop: 12 } },
                       h('thead', null,
                         h('tr', null,
                           h('th', { style: { textAlign: 'left' } }, 'Licenca'),
                           h('th', null, 'Comprados'),
                           h('th', null, 'Em uso'),
                           h('th', null, 'Livres')
                           )
                         ),
                       h('tbody', null, linhas)
                       )
                     ) : null
           )
}
