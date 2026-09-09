import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// No modo `pages` o site fica em https://<usuario>.github.io/<repo>/, entao os
// assets precisam do prefixo do repositorio.
const BASE_PAGES = '/nefro-m365-console/'

export default defineConfig(({ mode }) => ({
  base: mode === 'pages' ? BASE_PAGES : '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Evita CORS no desenvolvimento: o front chama sempre /api.
      '/api': { target: 'http://localhost:3333', changeOrigin: true },
    },
  },
}))
