import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND = process.env.BACKEND_URL ?? 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: { '/api': { target: BACKEND, changeOrigin: true } },
  },
  optimizeDeps: { include: ['plotly.js-dist-min'] },
})
