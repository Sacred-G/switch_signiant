import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
 
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
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
