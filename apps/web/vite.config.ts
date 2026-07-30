import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Evita CORS no desenvolvimento: o front chama sempre /api.
      '/api': { target: 'http://localhost:3333', changeOrigin: true },
    },
  },
})
