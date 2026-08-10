import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Erro } from '../../components/Estado'
import { IconeMicrosoft } from '../../components/icones'
import { SEM_BACKEND, metricasRepo } from '../../data'
import { money0 } from '../../lib/formato'
import { useConsulta } from '../../lib/useConsulta'
import { useSessao } from './sessao'
import estilos from './Login.module.css'

export function Login() {
  const { entrar, entrarComMicrosoft } = useSessao()
  const navegar = useNavigate()
  const { dados, erro, recarregar } = useConsulta(() => metricasRepo.visaoGeral())
  const [tenantId, setTenantId] = useState('00000000-0000-4000-8000-000000000001')
  const [clientId, setClientId] = useState('00000000-0000-4000-8000-000000000002')

  function acessar(modo: 'microsoft' | 'demo') {
if (modo === 'microsoft' && !SEM_BACKEND) {
    entrarComMicrosoft()
        return
}
    
    entrar({ tenantId, clientId, modo })
    navegar('/visao-geral')
  }

  return (
    <section className={estilos.login}>
      <div className={estilos.pitch}>
        <div className={estilos.brand}>
          <div className={estilos.mark}>N</div>
          <div>
            <b>Console M365</b>
            <small>NEFROCLÍNICAS · TI</small>
          </div>
        </div>

        <div>
          <h1>Toda licença parada aparece aqui.</h1>
          <p>
            Leitura direta do Microsoft Graph: quem não acessa há meses, qual licença está sendo paga
            sem uso e quanto isso custa por mês.
          </p>
          {dados && (
            <div className={estilos.stats}>
              <div>
                <span className={estilos.v}>{dados.totalContas}</span>
                <span className={estilos.l}>contas</span>
              </div>
              <div>
                <span className={estilos.v}>{dados.ociosos + dados.inativos}</span>
                <span className={estilos.l}>ociosas</span>
              </div>
              <div>
                <span className={estilos.v} style={{ color: 'var(--rose)' }}>
                  {money0(dados.desperdicioTotal)}
                </span>
                <span className={estilos.l}>por mês</span>
              </div>
            </div>
          )}
        </div>

        <p className="muted" style={{ fontSize: 12 }}>
          Somente leitura. O app não cria, altera nem exclui contas.
        </p>
      </div>

      <div className={estilos.form}>
        <h2>Entrar</h2>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Use a conta de administrador do tenant da clínica.
        </p>

        <label className={estilos.field}>
          <span>Tenant ID</span>
          <input value={tenantId} onChange={(e) => setTenantId(e.target.value)} spellCheck={false} />
        </label>

        <label className={estilos.field}>
          <span>Client ID (App Registration)</span>
          <input value={clientId} onChange={(e) => setClientId(e.target.value)} spellCheck={false} />
        </label>

        <button
          className="btn btn-primary btn-block"
          style={{ marginTop: 22 }}
          onClick={() => acessar('microsoft')}
        >
          <IconeMicrosoft />
          Entrar com a Microsoft
        </button>

        <div className={estilos.divider}>ou</div>

        <button className="btn btn-block" onClick={() => acessar('demo')}>
          Entrar em modo demo
        </button>

        <p className="muted" style={{ fontSize: 11.5, marginTop: 16 }}>
          {SEM_BACKEND
            ? 'Demo pública com dados fictícios, rodando inteira no seu navegador. Qualquer valor nos campos acima serve — nada sai daqui.'
            : 'O modo demo lê o banco local semeado com dados fictícios da clínica. Nada é enviado para o tenant.'}
        </p>

        {erro && (
          <div style={{ marginTop: 18 }}>
            <Erro mensagem={erro} aoTentarNovamente={recarregar} />
          </div>
        )}
      </div>
    </section>
  )
}
