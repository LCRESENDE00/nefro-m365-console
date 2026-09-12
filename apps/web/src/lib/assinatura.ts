import type { MensagemEmail } from './email'

/**
 * Assinatura de e-mail padrão da Nefroclínicas.
 *
 * Monta o HTML (tabela com estilos inline, que é o que Outlook, Outlook na web e Gmail
 * respeitam) e a versão em texto puro a partir dos dados da pessoa. As imagens — logo
 * branco no bloco vermelho e os ícones — ficam em `apps/web/public/assinatura/` e são
 * referenciadas pela URL pública do próprio console, porque cliente de e-mail não
 * carrega imagem embutida em base64 de forma confiável.
 *
 * Não existe API na Microsoft Graph para gravar a assinatura na caixa da pessoa; por isso
 * o fluxo é gerar aqui e a pessoa (ou o TI) colar no Outlook — `emailComInstrucoes`
 * manda tudo pronto para ela.
 */

export type DadosAssinatura = {
  nome: string
  cargo: string
  email: string
  telefone: string
  /** Uma linha por quebra de linha (\n). Vazio = sem linha de endereço. */
  endereco: string
  /** Texto ao lado dos ícones de Facebook e Instagram (ex.: Nefroclinicas). */
  redesSociais: string
}

export const REDES_SOCIAIS_PADRAO = 'Nefroclinicas'

/** Vermelho do bloco do logo (o mesmo do GIF institucional) e do nome. */
const VERMELHO_BLOCO = '#E34323'
const VERMELHO_NOME = '#E54323'
const CINZA_CARGO = '#8C8C8C'
const CINZA_TEXTO = '#6F6F6E'
const AZUL_LINK = '#0563C1'
const FONTE = "Arial, Helvetica, 'Segoe UI', sans-serif"

/** Pasta pública das imagens da assinatura, no host onde o console está publicado. */
export function urlBaseAssinatura(): string {
  return window.location.origin + import.meta.env.BASE_URL + 'assinatura/'
}

/** "31971679530" ou "+55 31 97167-9530" viram "(31) 97167-9530"; o resto fica como veio. */
export function formatarTelefoneBr(bruto: string): string {
  const texto = bruto.trim()
  if (!texto) return ''
  let digitos = texto.replace(/\D/g, '')
  if (digitos.length === 12 || digitos.length === 13) {
    if (digitos.startsWith('55')) digitos = digitos.slice(2)
  }
  if (digitos.length === 11) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`
  if (digitos.length === 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`
  return texto
}

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const linhasEndereco = (endereco: string) =>
  endereco
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean)

function linhaComIcone(urlBase: string, icone: string, alt: string, conteudoHtml: string, alinhar: 'middle' | 'top' = 'middle') {
  return (
    `<tr>` +
    `<td width="22" valign="${alinhar}" style="padding:3px 6px 3px 0;vertical-align:${alinhar};">` +
    `<img src="${urlBase}icone-${icone}.png" width="16" height="16" alt="${alt}" style="display:block;border:0;width:16px;height:16px;margin-top:${alinhar === 'top' ? 1 : 0}px;"></td>` +
    `<td valign="${alinhar}" style="padding:3px 0;font-family:${FONTE};font-size:13px;line-height:18px;color:${CINZA_TEXTO};vertical-align:${alinhar};white-space:nowrap;">${conteudoHtml}</td>` +
    `</tr>`
  )
}

/** A assinatura em HTML, pronta para colar no editor de assinaturas do Outlook. */
export function montarAssinaturaHtml(dados: DadosAssinatura, urlBase: string = urlBaseAssinatura()): string {
  const nome = escapar(dados.nome.trim())
  const cargo = escapar(dados.cargo.trim())
  const email = escapar(dados.email.trim())
  const telefone = escapar(formatarTelefoneBr(dados.telefone))
  const endereco = linhasEndereco(dados.endereco).map(escapar)
  const redes = escapar(dados.redesSociais.trim())

  const linhas: string[] = []
  if (email) {
    linhas.push(
      linhaComIcone(urlBase, 'email', 'E-mail', `<a href="mailto:${email}" style="color:${AZUL_LINK};text-decoration:underline;">${email}</a>`),
    )
  }
  if (telefone) linhas.push(linhaComIcone(urlBase, 'telefone', 'Telefone', telefone))
  if (endereco.length > 0) linhas.push(linhaComIcone(urlBase, 'local', 'Endereço', endereco.join('<br>'), 'top'))
  if (redes) {
    // Os dois ícones e o texto na mesma célula (colspan): numa coluna de 22px o Outlook
    // empilhava Facebook em cima do Instagram.
    linhas.push(
      `<tr>` +
      `<td colspan="2" valign="middle" style="padding:3px 0;font-family:${FONTE};font-size:13px;line-height:18px;color:${CINZA_TEXTO};vertical-align:middle;white-space:nowrap;">` +
      `<img src="${urlBase}icone-facebook.png" width="16" height="16" alt="Facebook" style="display:inline-block;border:0;width:16px;height:16px;vertical-align:middle;">` +
      `<img src="${urlBase}icone-instagram.png" width="16" height="16" alt="Instagram" style="display:inline-block;border:0;width:16px;height:16px;vertical-align:middle;margin-left:4px;">` +
      `<span style="margin-left:8px;vertical-align:middle;">${redes}</span>` +
      `</td>` +
      `</tr>`,
    )
  }

  return (
    `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;font-family:${FONTE};">` +
    `<tr>` +
    `<td width="130" bgcolor="${VERMELHO_BLOCO}" align="center" valign="middle" style="background-color:${VERMELHO_BLOCO};width:130px;padding:26px 10px;text-align:center;vertical-align:middle;">` +
    `<img src="${urlBase}logo.png" width="110" height="49" alt="Nefroclínicas" style="display:block;border:0;width:110px;height:auto;margin:0 auto;">` +
    `</td>` +
    `<td valign="middle" style="padding:10px 16px 10px 22px;vertical-align:middle;">` +
    // nowrap: a tabela cresce para caber o nome/endereço em vez de quebrar linha no painel
    // de leitura estreito do Outlook (assinatura tem largura fixa, como a do modelo).
    `<div style="font-family:${FONTE};font-size:19px;line-height:23px;font-weight:bold;color:${VERMELHO_NOME};text-transform:uppercase;letter-spacing:0.5px;margin:0 0 2px;white-space:nowrap;">${nome}</div>` +
    (cargo ? `<div style="font-family:${FONTE};font-size:14px;line-height:18px;font-weight:bold;color:${CINZA_CARGO};margin:0 0 8px;white-space:nowrap;">${cargo}</div>` : `<div style="height:6px;line-height:6px;font-size:6px;">&nbsp;</div>`) +
    `<table cellpadding="0" cellspacing="0" border="0" role="presentation" style="border-collapse:collapse;">${linhas.join('')}</table>` +
    `</td>` +
    `</tr>` +
    `</table>`
  )
}

/** Versão em texto puro (para o campo "texto sem formatação" e para quem lê sem HTML). */
export function montarAssinaturaTexto(dados: DadosAssinatura): string {
  const linhas = [dados.nome.trim().toUpperCase(), dados.cargo.trim()]
  if (dados.email.trim()) linhas.push(dados.email.trim())
  const telefone = formatarTelefoneBr(dados.telefone)
  if (telefone) linhas.push(telefone)
  linhas.push(...linhasEndereco(dados.endereco))
  if (dados.redesSociais.trim()) linhas.push(`Facebook e Instagram: ${dados.redesSociais.trim()}`)
  return linhas.filter(Boolean).join('\n')
}

/** Arquivo .htm completo: abre no navegador para "selecionar tudo + copiar" quando o botão de copiar não funcionar. */
export function documentoAssinatura(html: string, nome: string): string {
  return (
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">` +
    `<title>Assinatura – ${escapar(nome)}</title></head>` +
    `<body style="margin:24px;background:#ffffff;">${html}</body></html>`
  )
}

/**
 * Copia a assinatura com formatação (text/html) e, junto, a versão em texto. Colar no
 * Outlook, Gmail ou Word mantém o layout; colar num campo simples cola só o texto.
 */
export async function copiarAssinatura(html: string, texto: string): Promise<'formatada' | 'texto'> {
  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([texto], { type: 'text/plain' }),
        }),
      ])
      return 'formatada'
    } catch {
      // cai para a seleção manual abaixo
    }
  }
  const area = document.createElement('div')
  area.contentEditable = 'true'
  area.style.position = 'fixed'
  area.style.left = '-9999px'
  area.innerHTML = html
  document.body.appendChild(area)
  const selecao = window.getSelection()
  const intervalo = document.createRange()
  intervalo.selectNodeContents(area)
  selecao?.removeAllRanges()
  selecao?.addRange(intervalo)
  let copiou = false
  try {
    copiou = document.execCommand('copy')
  } finally {
    selecao?.removeAllRanges()
    area.remove()
  }
  if (copiou) return 'formatada'
  await navigator.clipboard.writeText(texto)
  return 'texto'
}

const PASSOS_OUTLOOK =
  `<ol style="margin:0 0 14px;padding-left:20px;">` +
  `<li><b>Outlook (novo) e Outlook na web</b>: engrenagem ⚙ &gt; <b>Contas</b> &gt; <b>Assinaturas</b> &gt; <b>Nova assinatura</b>, ` +
  `dê um nome (ex.: Nefroclínicas), clique dentro da caixa e cole (<b>Ctrl+V</b>). Em "Assinaturas padrão", escolha essa ` +
  `assinatura para novas mensagens e para respostas e clique em <b>Salvar</b>.</li>` +
  `<li><b>Outlook clássico (Windows)</b>: <b>Arquivo</b> &gt; <b>Opções</b> &gt; <b>Email</b> &gt; <b>Assinaturas…</b> &gt; <b>Novo</b>, ` +
  `dê um nome, cole na caixa de edição (<b>Ctrl+V</b>) e defina como padrão para "Novas mensagens" e "Respostas/encaminhamentos".</li>` +
  `<li><b>Celular (app Outlook)</b>: Configurações &gt; sua conta &gt; <b>Assinatura</b>. O app aceita só texto; use a versão em texto do fim deste e-mail.</li>` +
  `</ol>`

/**
 * E-mail com a assinatura pronta e o passo a passo para instalar, enviado pela caixa de
 * quem está logado no console (POST /me/sendMail). Vai também o .htm em anexo.
 */
export function emailComInstrucoes(dados: DadosAssinatura, destinatario: string, urlBase: string = urlBaseAssinatura()): MensagemEmail {
  const html = montarAssinaturaHtml(dados, urlBase)
  const texto = montarAssinaturaTexto(dados)
  const primeiroNome = dados.nome.trim().split(/\s+/)[0] || 'olá'
  const corpo =
    `<div style="font-family:${FONTE};font-size:14px;line-height:21px;color:#222;">` +
    `<p>Olá, ${escapar(primeiroNome)}!</p>` +
    `<p>Esta é a sua assinatura de e-mail padrão da Nefroclínicas. Para usar, <b>selecione o bloco abaixo inteiro</b> ` +
    `(clique antes do bloco vermelho e arraste até o fim), copie (<b>Ctrl+C</b>) e siga os passos do seu Outlook:</p>` +
    PASSOS_OUTLOOK +
    `<p style="margin:0 0 6px;color:#777;font-size:12px;">— início da assinatura —</p>` +
    html +
    `<p style="margin:6px 0 18px;color:#777;font-size:12px;">— fim da assinatura —</p>` +
    `<p>Se preferir, o arquivo <b>assinatura.htm</b> em anexo abre no navegador com a assinatura sozinha na tela: ` +
    `<b>Ctrl+A</b>, <b>Ctrl+C</b> e cole no Outlook.</p>` +
    `<p style="margin-top:18px;">Versão em texto (para o celular):</p>` +
    `<pre style="font-family:${FONTE};font-size:13px;line-height:19px;color:#444;white-space:pre-wrap;margin:0;">${escapar(texto)}</pre>` +
    `<p style="margin-top:18px;color:#777;font-size:12px;">Qualquer dúvida, fale com a TI.</p>` +
    `</div>`
  return {
    destinatarios: [destinatario],
    assunto: 'Sua assinatura de e-mail – Nefroclínicas',
    html: corpo,
    anexos: [{ nome: 'assinatura.htm', conteudo: documentoAssinatura(html, dados.nome), tipo: 'text/html' }],
  }
}
