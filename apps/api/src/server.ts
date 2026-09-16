/** Entrada de linha de comando: `npm run dev -w apps/api` e `npm start`. */
import { HOST_LOCAL, iniciarApi } from './app.js'

const { porta } = await iniciarApi(Number(process.env.PORT ?? 3333))

console.log(`API do Console M365 em http://${HOST_LOCAL}:${porta} (so local)`)
