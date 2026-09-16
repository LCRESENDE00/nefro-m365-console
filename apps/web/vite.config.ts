import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// O NefroControl roda so localmente: nada e publicado (sem GitHub Pages nem Azure),
// entao a base e sempre "/" e o front escuta apenas em localhost, nunca em 0.0.0.0.
// A porta e fixa (strictPort) porque o login da Microsoft volta exatamente para
// http://localhost:5173/login, a URI cadastrada no app registration.
export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    proxy: {
      // Evita CORS no desenvolvimento: o front chama sempre /api. A API escuta so em 127.0.0.1.
      '/api': { target: 'http://127.0.0.1:3333', changeOrigin: true },
    },
  },
  // `npm run local`: serve o build sem API na mesma origem do `npm run dev`.
  preview: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
  },
})
