import { BrowserWindow, app, dialog, shell } from 'electron'
import { appendFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const pastaDist = __dirname

// Fixa o nome antes de qualquer getPath: sem isso, em desenvolvimento os dados
// iriam parar em %APPDATA%\@nefro\desktop, e so no app empacotado usariam o
// productName. Assim as duas execucoes apontam para a mesma pasta.
app.setName('Console M365')

/**
 * Empacotado, os arquivos extras ficam em `resources/`. Em desenvolvimento,
 * cada um continua no seu lugar dentro do repositorio.
 */
const caminhos = {
  template: app.isPackaged
    ? join(process.resourcesPath, 'dados-template.db')
    : resolve(pastaDist, '..', 'recursos', 'dados-template.db'),
  web: app.isPackaged
    ? join(process.resourcesPath, 'web')
    : resolve(pastaDist, '..', '..', 'web', 'dist'),
}

/**
 * Log em arquivo: um app de janela nao tem console, entao sem isto qualquer
 * falha na inicializacao vira so um dialogo sem rastro.
 */
function registrar(mensagem: string) {
  const linha = `${new Date().toISOString()} ${mensagem}\n`
  console.log(mensagem)
  try {
    appendFileSync(join(app.getPath('userData'), 'console-m365.log'), linha)
  } catch {
    // Sem permissao de escrita: o log e util, mas nao pode impedir o app de abrir.
  }
}

/** Banco do usuario: %APPDATA%\Console M365\dados.db no Windows. */
function prepararBanco() {
  const pastaDados = app.getPath('userData')
  mkdirSync(pastaDados, { recursive: true })

  const banco = join(pastaDados, 'dados.db')
  if (!existsSync(banco)) {
    if (!existsSync(caminhos.template)) {
      throw new Error(`Template do banco não encontrado em ${caminhos.template}`)
    }
    // Primeira execucao: o banco nasce com o schema e sem dados; a API semeia.
    copyFileSync(caminhos.template, banco)
  }

  return banco
}

async function criarJanela(url: string) {
  const janela = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0E1117',
    show: false,
    title: 'Console M365',
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  })

  janela.once('ready-to-show', () => janela.show())

  // Links externos abrem no navegador, nunca dentro do app.
  janela.webContents.setWindowOpenHandler(({ url: destino }) => {
    shell.openExternal(destino)
    return { action: 'deny' }
  })

  await janela.loadURL(url)
  return janela
}

async function iniciar() {
  const banco = prepararBanco()
  process.env.DATABASE_URL = `file:${banco}`

  // Importado so agora: a API le DATABASE_URL no momento em que e carregada.
  const { iniciarApi } = await import('@nefro/api')
  const { porta } = await iniciarApi(0, { pastaEstatica: caminhos.web })

  registrar(`banco: ${banco}`)
  registrar(`api interna: http://127.0.0.1:${porta}/`)

  await criarJanela(`http://127.0.0.1:${porta}/`)
  registrar('janela carregada')
}

app.whenReady().then(() =>
  iniciar().catch((erro: Error) => {
    registrar(`FALHA: ${erro.stack ?? erro.message}`)
    dialog.showErrorBox('Não foi possível iniciar o Console M365', erro.stack ?? erro.message)
    app.quit()
  }),
)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) iniciar()
})
