import { useMemo, useState } from 'react'
import { useToast } from '../../components/Toast'
import {
  copiarAssinatura,
  documentoAssinatura,
  emailComInstrucoes,
  montarAssinaturaHtml,
  montarAssinaturaTexto,
  type DadosAssinatura,
} from '../../lib/assinatura'
import { baixar } from '../../lib/baixar'
import { enviarEmail } from '../../lib/graph'
import estilos from './AssinaturaEmail.module.css'

type Props = {
  /** Dados já preenchidos (do cadastro ou lidos do Graph); todos ficam editáveis aqui. */
  inicial: DadosAssinatura
  /** Para quem o e-mail com a assinatura vai por padrão (normalmente o UPN da pessoa). */
  destinatarioPadrao: string
  /** Com `aoFechar`, o card ganha o botão de fechar (uso como modal na lista de usuários). */
  aoFechar?: () => void
}

/**
 * Assinatura de e-mail padrão da Nefroclínicas para uma pessoa: pré-visualização ao vivo,
 * campos editáveis, copiar com formatação, baixar .htm e enviar por e-mail com o passo a
 * passo de instalação no Outlook.
 */
export function AssinaturaEmail({ inicial, destinatarioPadrao, aoFechar }: Props) {
  const toast = useToast()
  const [dados, setDados] = useState<DadosAssinatura>(inicial)
  const [destinatario, setDestinatario] = useState(destinatarioPadrao)
  const [enviando, setEnviando] = useState(false)
  const [enviadoPara, setEnviadoPara] = useState<string | null>(null)
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)

  const html = useMemo(() => montarAssinaturaHtml(dados), [dados])
  const texto = useMemo(() => montarAssinaturaTexto(dados), [dados])

  const mudar = <C extends keyof DadosAssinatura>(campo: C, valor: DadosAssinatura[C]) =>
    setDados((atual) => ({ ...atual, [campo]: valor }))

  async function copiar() {
    try {
      const como = await copiarAssinatura(html, texto)
      toast(como === 'formatada' ? 'Assinatura copiada — cole no editor de assinaturas do Outlook' : 'Copiada só a versão em texto')
    } catch {
      toast('Não deu para copiar automaticamente — baixe o .htm e copie de lá.')
    }
  }

  function baixarHtm() {
    const nomeArquivo = 'assinatura-' + (dados.nome.trim().toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'nefroclinicas') + '.htm'
    baixar({ nome: nomeArquivo, conteudo: new Blob([documentoAssinatura(html, dados.nome)], { type: 'text/html;charset=utf-8' }) })
  }

  async function enviar() {
    const para = destinatario.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(para)) {
      setErroEnvio('Informe um e-mail válido.')
      return
    }
    setEnviando(true)
    setErroEnvio(null)
    try {
      await enviarEmail(emailComInstrucoes(dados, para))
      setEnviadoPara(para)
      toast('Assinatura enviada para ' + para)
    } catch (falha) {
      setErroEnvio(falha instanceof Error ? falha.message : 'Não foi possível enviar o e-mail.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section className={estilos.card} aria-label="Assinatura de e-mail">
      <div className={estilos.topo}>
        <div>
          <h3>Assinatura de e-mail</h3>
          <p>
            Padrão Nefroclínicas, montada com os dados da conta. Ajuste o que precisar, copie e cole no Outlook — ou envie
            para a pessoa com o passo a passo.
          </p>
        </div>
        {aoFechar && (
          <button className={estilos.fechar} onClick={aoFechar} aria-label="Fechar">
            ×
          </button>
        )}
      </div>

      <div className={estilos.previa}>
        {/* HTML gerado por nós (montarAssinaturaHtml escapa os campos), não vem de fora. */}
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>

      <div className={estilos.campos}>
        <label className={estilos.campo}>
          <span>Nome</span>
          <input value={dados.nome} onChange={(e) => mudar('nome', e.target.value)} />
        </label>
        <label className={estilos.campo}>
          <span>Cargo</span>
          <input value={dados.cargo} placeholder="Ex.: Analista de Eventos e Marketing" onChange={(e) => mudar('cargo', e.target.value)} />
        </label>
        <label className={estilos.campo}>
          <span>E-mail</span>
          <input value={dados.email} onChange={(e) => mudar('email', e.target.value)} />
        </label>
        <label className={estilos.campo}>
          <span>Telefone</span>
          <input value={dados.telefone} placeholder="(31) 99999-9999" onChange={(e) => mudar('telefone', e.target.value)} />
        </label>
        <label className={`${estilos.campo} ${estilos.largo}`}>
          <span>Endereço (uma linha por quebra; vem da unidade em Configurações)</span>
          <textarea rows={2} value={dados.endereco} onChange={(e) => mudar('endereco', e.target.value)} />
        </label>
        <label className={estilos.campo}>
          <span>Redes sociais (Facebook e Instagram)</span>
          <input value={dados.redesSociais} onChange={(e) => mudar('redesSociais', e.target.value)} />
        </label>
      </div>

      <div className={estilos.acoes}>
        <button className="btn btn-primary" onClick={() => void copiar()}>
          Copiar assinatura
        </button>
        <button className="btn" onClick={baixarHtm}>
          Baixar .htm
        </button>
        <div className={estilos.envio}>
          <input
            value={destinatario}
            placeholder="e-mail de destino"
            aria-label="E-mail de destino"
            onChange={(e) => {
              setDestinatario(e.target.value)
              setEnviadoPara(null)
              setErroEnvio(null)
            }}
            onKeyDown={(e) => e.key === 'Enter' && !enviando && void enviar()}
          />
          <button className="btn" onClick={() => void enviar()} disabled={enviando}>
            {enviando ? 'Enviando…' : enviadoPara ? 'Enviar de novo' : 'Enviar por e-mail'}
          </button>
        </div>
      </div>
      {erroEnvio && <p className={estilos.erro}>{erroEnvio}</p>}
      {enviadoPara && !erroEnvio && (
        <p className={estilos.ok}>
          Enviado para {enviadoPara} pela sua caixa, com o passo a passo de instalação e o arquivo .htm em anexo.
        </p>
      )}
      <p className={estilos.nota}>
        A Microsoft Graph não tem como gravar a assinatura direto na caixa da pessoa; por isso ela recebe pronta e cola no
        Outlook (novo, web ou clássico) uma única vez. As imagens ficam hospedadas no próprio NefroControl.
      </p>
    </section>
  )
}
