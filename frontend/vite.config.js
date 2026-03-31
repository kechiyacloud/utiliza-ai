import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom')
    }
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return
          }

          if (id.includes('recharts') || id.includes('d3-')) {
            return 'charts'
          }

          if (id.includes('jspdf') || id.includes('jspdf-autotable')) {
            return 'pdf'
          }

          if (id.includes('xlsx')) {
            return 'excel'
          }

          if (id.includes('lucide-react')) {
            return 'icons'
          }

          if (id.includes('react-router') || id.includes('react-dom') || id.includes('react/')) {
            return 'react'
          }

          return 'vendor'
        }
      }
    }
  },
  server: {
    allowedHosts: true,
    proxy: {
      '^/(api/)?(login|register|employees?|dashboard|projects|allocations|clients|partners|availability|departments|feedback)': {
        target: 'http://backend:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
