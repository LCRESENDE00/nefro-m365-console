import { useEffect, useState } from 'react'
import { useToast } from '../../components/Toast'
import { useDadosReais } from '../../lib/dadosReais'
import { separarEnderecos } from '../../lib/email'
import {
  lerConfigEnvio,
  lerUltimoDisparo,
  linkEditarConfig,
  linkWorkflow,
  type ConfigEnvio,
  type UltimoDisparo,
} from '../../lib/envioAutomatico'
import { enviarEmail } from '../../lib/graph'
import { dataHora } from '../../lib/formato'
import { usePrecos } from '../../lib/precos'
import { montarAlertaInativas, montarResumoMensal } from '../../lib/resumoEmail'
import estilos from './Relatorios.module.css'

type Enviando = 'resumo' | 'alerta' | null

/**
 * Card "Envio automático" do site publicado (sem backend).
 *
 * Duas coisas acontecem aqui:
 *  - o disparo agendado roda no GitHub Actions do repositório (todo dia 1º e toda segunda),
 *    com token de aplicativo, sem depender de ninguém logado — esta tela só mostra a
 *    configuração (envio-automatico.json) e o resultado do último disparo;
 *  - "Enviar agora" monta o mesmo e-mail com os dados já carregados no console e envia
 *    pela caixa de quem está logado (Microsoft Graph, escopo Mail.Send).
 */
export function EnvioAutomatico() {
  const dr = useDadosReais()
  const toast = useToast()
  const { precos } = usePrecos()
  const [config, setConfig] = useState<ConfigEnvio | null>(null)
  const [erroConfig, setErroConfig] = useState<string | null>(null)
  const [ultimo, setUltimo] = useState<UltimoDisparo | null | 'erro' | 'carregando'>('carregando')
  const [destinatarios, setDestinatarios] = useState('')
  const [enviando, setEnviando] = useState<Enviando>(null)

  useEffect(() => {
    let ativo = true
    lerConfigEnvio()
      .then((lida) => {
        if (!ativo) return
        setConfig(lida)
        setDestinatarios(lida.destinatarios.join(', '))
        return lerUltimoDisparo(lida)
          .then((disparo) => ativo && setUltimo(disparo))
          .catch(() => ativo && setUltimo('erro'))
      })
      .catch((falha: Error) => ativo && setErroConfig(falha.message))
    return () => {
      ativo = false
    }
  }, [])

  const prontoParaEnviar = dr.conectado && dr.usuarios !== null && dr.licencas.length > 0
  const limiares = { limiarOcioso: dr.limiarOcioso, limiarInativo: dr.limiarInativo }

  async function enviar(tipo: Exclude<Enviando, null>) {
    const enderecos = separarEnderecos(destinatarios)
    if (enderecos.length === 0) {
      toast('Informe pelo menos um e-mail de destino')
      return
    }
    if (!prontoParaEnviar || !dr.usuarios) {
      toast('Aguarde o console terminar de ler os dados da Microsoft')
      return
    }
    setEnviando(tipo)
    try {
      const entrada = { licencas: dr.licencas, usuarios: dr.usuarios, mfa: dr.mfa, precos, ...limiares }
      const email =
        tipo === 'resumo'
          ? montarResumoMensal(entrada)
          : montarAlertaInativas({ ...entrada, janelaDias: config?.janelaAlertaDias })
      if (!email) {
        toast(`Nenhuma conta passou de ${dr.limiarInativo} dias sem acesso nos últimos ${config?.janelaAlertaDias ?? 7} dias — nada a enviar`)
        return
      }
      await enviarEmail({ destinatarios: enderecos, assunto: email.assunto, html: email.html, anexos: email.anexos })
      toast(`Enviado para ${enderecos.join(', ')}`)
    } catch (falha) {
      toast((falha as Error).message)
    } finally {
      setEnviando(null)
    }
  }

  const algumAtivo = !!config && (config.resumoMensal || config.alertaContaInativa)

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="card-h">
        <h3>Envio automático</h3>
        {config && (
          <span className={`badge ${algumAtivo ? 'b-ok' : 'b-neutral'}`} style={{ marginLeft: 'auto' }}>
            {algumAtivo ? 'Ativo' : 'Desligado'}
          </span>
        )}
      </div>

      {erroConfig && (
        <p className="muted" style={{ fontSize: 12.5, margin: '4px 0 10px' }}>
          Não foi possível ler a configuração do envio automático: {erroConfig}
        </p>
      )}

      {config && (
        <>
          <div className="set-row">
            <div className="txt">
              <b>Resumo mensal por e-mail</b>
              <span>
                Todo dia 1º, às 08:00, para {config.destinatarios.join(', ') || 'ninguém (sem destinatário)'} — licenças,
                contas por situação, economia possível e os CSVs em anexo
              </span>
            </div>
            <span className={`badge ${config.resumoMensal ? 'b-ok' : 'b-neutral'}`}>
              {config.resumoMensal ? 'Ligado' : 'Desligado'}
            </span>
          </div>
          <div className="set-row">
            <div className="txt">
              <b>Alerta de conta inativa</b>
              <span>
                Toda segunda, às 08:00: contas que passaram de {config.limiarInativo} dias sem acesso nos últimos{' '}
                {config.janelaAlertaDias} dias (só envia quando há alguma)
              </span>
            </div>
            <span className={`badge ${config.alertaContaInativa ? 'b-ok' : 'b-neutral'}`}>
              {config.alertaContaInativa ? 'Ligado' : 'Desligado'}
            </span>
          </div>
          <div className="set-row">
            <div className="txt">
              <b>Último disparo automático</b>
              <span>
                {ultimo === 'carregando' && 'consultando o GitHub…'}
                {ultimo === 'erro' && 'não foi possível consultar o GitHub agora'}
                {ultimo === null && 'ainda não rodou — o primeiro disparo é no próximo dia 1º (ou pode ser feito à mão no GitHub)'}
                {ultimo && ultimo !== 'carregando' && ultimo !== 'erro' && (
                  <>
                    {dataHora(ultimo.quando)} · {ultimo.situacao}
                    {ultimo.origem === 'workflow_dispatch' ? ' (disparado à mão)' : ''} ·{' '}
                    <a href={ultimo.link} target="_blank" rel="noreferrer">
                      ver execução
                    </a>
                  </>
                )}
              </span>
            </div>
            {ultimo && ultimo !== 'carregando' && ultimo !== 'erro' && (
              <span className={`badge ${ultimo.sucesso === null ? 'b-warn' : ultimo.sucesso ? 'b-ok' : 'b-bad'}`}>
                {ultimo.sucesso === null ? 'Rodando' : ultimo.sucesso ? 'OK' : 'Falhou'}
              </span>
            )}
          </div>
        </>
      )}

      <div className={estilos.enviarAgora}>
        <label>
          <span>Enviar agora para</span>
          <input
            type="text"
            value={destinatarios}
            onChange={(e) => setDestinatarios(e.target.value)}
            placeholder="nome@nefroclinicas.com.br, outro@nefroclinicas.com.br"
            spellCheck={false}
          />
        </label>
        <div className={estilos.acoes}>
          <button className="btn btn-primary" onClick={() => enviar('resumo')} disabled={enviando !== null || !prontoParaEnviar}>
            {enviando === 'resumo' ? 'Enviando…' : 'Enviar resumo mensal'}
          </button>
          <button className="btn" onClick={() => enviar('alerta')} disabled={enviando !== null || !prontoParaEnviar}>
            {enviando === 'alerta' ? 'Enviando…' : 'Enviar alerta de inativas'}
          </button>
        </div>
        <p className="muted">
          {prontoParaEnviar
            ? `Sai da caixa de ${dr.nome ?? 'quem está logado'}, com os dados que o console acabou de ler. Na primeira vez a Microsoft pede permissão de envio (Mail.Send).`
            : 'Aguardando o console terminar de ler licenças e contas da Microsoft…'}
        </p>
      </div>

      {config && (
        <p className="muted" style={{ fontSize: 11.5, marginTop: 14, marginBottom: 0 }}>
          O disparo agendado roda no GitHub Actions do repositório, com credencial de aplicativo — não precisa de ninguém
          logado. Remetente: {config.remetente || 'não definido'}. Para mudar destinatário, remetente ou desligar um envio,{' '}
          <a href={linkEditarConfig(config)} target="_blank" rel="noreferrer">
            edite envio-automatico.json
          </a>
          ; para disparar à mão,{' '}
          <a href={linkWorkflow(config)} target="_blank" rel="noreferrer">
            abra o workflow no GitHub
          </a>
          .
        </p>
      )}
    </div>
  )
}
