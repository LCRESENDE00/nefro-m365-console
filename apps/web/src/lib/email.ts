/**
 * Formato de e-mail que a Microsoft Graph espera em POST .../sendMail.
 *
 * Módulo sem MSAL nem fetch: o console (lib/graph.ts, enviando pela caixa de quem está
 * logado) e o script agendado (scripts/envio-automatico.ts, enviando com token de
 * aplicativo) montam o mesmo corpo por aqui.
 */

export type AnexoEmail = { nome: string; conteudo: string; tipo?: string }

export type MensagemEmail = {
  destinatarios: string[]
  assunto: string
  html: string
  anexos?: AnexoEmail[]
}

/** Converte texto (UTF-8) em base64 no navegador, que é como a Graph recebe o conteúdo dos anexos. */
export function textoParaBase64(texto: string): string {
  const bytes = new TextEncoder().encode(texto)
  let binario = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binario)
}

/** Corpo de POST .../sendMail. `base64` muda conforme o ambiente (btoa no navegador, Buffer no Node). */
export function corpoSendMail(mensagem: MensagemEmail, base64: (texto: string) => string = textoParaBase64) {
  return {
    message: {
      subject: mensagem.assunto,
      body: { contentType: 'HTML', content: mensagem.html },
      toRecipients: mensagem.destinatarios.map((endereco) => ({ emailAddress: { address: endereco } })),
      attachments: (mensagem.anexos ?? []).map((anexo) => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: anexo.nome,
        contentType: anexo.tipo ?? 'text/csv',
        contentBytes: base64(anexo.conteudo),
      })),
    },
    saveToSentItems: true,
  }
}

/** Separa "a@x.com, b@x.com; c@x.com" em endereços válidos, sem repetidos. */
export function separarEnderecos(texto: string): string[] {
  const vistos = new Set<string>()
  const enderecos: string[] = []
  for (const parte of texto.split(/[,;\s]+/)) {
    const endereco = parte.trim().toLowerCase()
    if (!endereco || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(endereco) || vistos.has(endereco)) continue
    vistos.add(endereco)
    enderecos.push(endereco)
  }
  return enderecos
}
