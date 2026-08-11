import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconeMicrosoft } from '../../components/icones'
import { entrarComMicrosoft } from '../../lib/graph'
import { useSessao } from './sessao'
import estilos from './Login.module.css'

export function Login() {
  const { entrar } = useSessao()
  const navegar = useNavigate()
  const [entrando, setEntrando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function acessar() {
    setEntrando(true)
    setErro(null)
    try {
      const conta = await entrarComMicrosoft()
      entrar({ tenantId: '', clientId: '', modo: 'microsoft', nome: conta.nome })
      navegar('/visao-geral')
    } catch (e: any) {
      setErro(e && e.message ? e.message : 'Nao foi possivel entrar com a Microsoft.')
    } finally {
      setEntrando(false)
    }
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
            Leitura e ação direta na Microsoft Graph: quem não acessa há meses, qual licença está sendo paga
            sem uso, e cadastro de conta nova quando precisar.
          </p>
        </div>

        <p className="muted" style={{ fontSize: 12 }}>
          Login real com a Microsoft. Somente leitura, exceto criar conta, redefinir senha e ativar/desativar
          conta — que gravam de verdade no tenant e sempre pedem confirmação antes de executar.
        </p>
      </div>

      <div className={estilos.form}>
        <h2>Entrar</h2>
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Use a conta de administrador do tenant da clínica no Microsoft 365.
        </p>

        <button className="btn btn-primary btn-block" style={{ marginTop: 22 }} onClick={acessar} disabled={entrando}>
          <IconeMicrosoft />
          {entrando ? 'Conectando...' : 'Entrar com a Microsoft'}
        </button>

        <p className="muted" style={{ fontSize: 11.5, marginTop: 16 }}>
          Abre o login oficial da Microsoft em um popup. Nenhuma senha é digitada aqui: a autenticação é feita
          inteira pela Microsoft, e só o token da sua sessão fica guardado neste navegador.
        </p>

        {erro && <p style={{ color: 'var(--rose)', marginTop: 12 }}>{erro}</p>}
      </div>
    </section>
  )
}
