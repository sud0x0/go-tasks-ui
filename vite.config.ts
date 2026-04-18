import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  server: {
    port: 3000,
    strictPort: true,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 'http://localhost:8080',
        changeOrigin: false,
      },
      '/health': {
        target: process.env.VITE_API_TARGET || 'http://localhost:8080',
        changeOrigin: false,
      },
    },
  },
})
