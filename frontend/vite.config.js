import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      'xlsx': path.resolve(__dirname, 'node_modules/xlsx/xlsx.mjs')
    }
  },
  server: {
    allowedHosts: true,
    proxy: {
      '^/(login|register|employees?|dashboard|projects|allocations|clients|partners|availability|departments)': {
        target: 'http://backend:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
