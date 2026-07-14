import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['www.peter1947.space', 'peter1947.space', 'localhost'],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5055',
        changeOrigin: true,
      }
    }
  }
})
