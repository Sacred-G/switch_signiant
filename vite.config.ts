import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
 
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@', replacement: '/src' }
    ]
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      },
      '/identity-api': {
        target: 'https://identity.services.cloud.signiant.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/identity-api/, ''),
        secure: true
      },
      '/platform-api': {
        target: 'https://platform-api-service.services.cloud.signiant.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/platform-api/, ''),
        secure: true
      }
    }
  }
})
