import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/Ai-use-interview-using-c-/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': import.meta.dirname + '/src',
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Forward API calls to the Express backend during development.
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: false,
      },
    },
  },
})
