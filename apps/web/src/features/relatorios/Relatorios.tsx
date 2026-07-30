import { useState } from 'react'
import { Carregando, Erro } from '../../components/Estado'
import { IconeRelatorios } from '../../components/icones'
import { LinhaToggle } from '../../components/LinhaToggle'
import { useToast } from '../../components/Toast'
import { configuracoesRepo, relatoriosRepo } from '../../data'
import { useSubtitulo } from '../../layout/pagina'
import { baixar } from '../../lib/baixar'
import { useDados } from '../../lib/dados'
import { dataHora } from '../../lib/formato'
import { useConsulta } from '../../lib/useConsulta'
import estilos from './Relatorios.module.css'

const DESCRICOES: Record<string, string> = {
  'usuarios-inativos':
    'Todas as contas licenciadas ordenadas pelo último login, com setor, licença e custo mensal.',
  licencas: 'Assentos contratados, atribuídos e livres por plano, com valor mensal e anual.',
  onedrive: 'Espaço e número de arquivos por conta, com destaque para contas inativas.',
  mfa: 'Situação do MFA por conta e por setor, com as pendências listadas primeiro.',
}

export function Relatorios() {
  const { versao, invalidar } = useDados()
  const toast = useToast()
  const [gerando, setGerando] = useState<string | null>(null)
  const { dados, carregando, erro, recarregar } = useConsulta(() => relatoriosRepo.catalogo(), [versao])

  useSubtitulo('Exportações em CSV, geradas a partir do banco')

  async function gerar(tipo: string) {
    setGerando(tipo)
    try {
      const arquivo = await relatoriosRepo.gerar(tipo)
      baixar(arquivo)
      invalidar()
      toast(`Gerado: ${arquivo.nome}`)
    } catch (falha) {
      toast((falha as Error).message)
    } finally {
      setGerando(null)
    }
  }

  async function alternar(chave: 'resumoMensal' | 'alertaContaInativa' | 'copiaPastaTI', valor: boolean) {
    await configuracoesRepo.salvar({ [chave]: valor })
    invalidar()
  }

  if (erro) return <Erro mensagem={erro} aoTentarNovamente={recarregar} />
  if (carregando || !dados) return <Carregando />

  const envio = dados.envioAutomatico
  const algumAtivo = envio.resumoMensal || envio.alertaContaInativa || envio.copiaPastaTI

  return (
    <>
      <div className="grid g2">
        {dados.disponiveis.map((relatorio) => (
          <div className={estilos.rep} key={relatorio.tipo}>
            <div className={estilos.ic}>
              <IconeRelatorios />
            </div>
            <div style={{ flex: 1 }}>
              <h4>{relatorio.titulo}</h4>
              <p>{DESCRICOES[relatorio.tipo] ?? ''}</p>
              <button
                className="btn"
                onClick={() => gerar(relatorio.tipo)}
                disabled={gerando === relatorio.tipo}
              >
                {gerando === relatorio.tipo ? 'Gerando…' : 'Gerar .csv'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-h">
          <h3>Envio automático</h3>
          <span className={`badge ${algumAtivo ? 'b-ok' : 'b-neutral'}`} style={{ marginLeft: 'auto' }}>
            {algumAtivo ? 'Ativo' : 'Desligado'}
          </span>
        </div>

        <LinhaToggle
          titulo="Resumo mensal por e-mail"
          descricao={`Todo dia 1º, às 08:00, para ${envio.destinatario}`}
          ligado={envio.resumoMensal}
          aoAlternar={(v) => alternar('resumoMensal', v)}
        />
        <LinhaToggle
          titulo="Alerta de conta inativa"
          descricao="Avisa quando uma conta passa da janela de análise sem acesso"
          ligado={envio.alertaContaInativa}
          aoAlternar={(v) => alternar('alertaContaInativa', v)}
        />
        <LinhaToggle
          titulo="Cópia na pasta da TI"
          descricao="Salva cada relatório gerado no SharePoint da equipe"
          ligado={envio.copiaPastaTI}
          aoAlternar={(v) => alternar('copiaPastaTI', v)}
        />

        <p className="muted" style={{ fontSize: 11.5, marginTop: 14, marginBottom: 0 }}>
          As preferências ficam gravadas no banco. O disparo de e-mail em si depende de um serviço de
          envio, ainda não conectado.
        </p>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-h">
          <h3>Últimas exportações</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>Arquivo</th>
              <th>Gerado por</th>
              <th>Data</th>
              <th>Linhas</th>
            </tr>
          </thead>
          <tbody>
            {dados.historico.map((exportacao) => (
              <tr key={exportacao.id}>
                <td className="mono" style={{ fontSize: 12.5 }}>
                  {exportacao.arquivo}
                </td>
                <td style={{ textTransform: 'capitalize' }}>{exportacao.geradoPor}</td>
                <td className="muted">{dataHora(exportacao.criadoEm)}</td>
                <td className="mono">{exportacao.linhas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
