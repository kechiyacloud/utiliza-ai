import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      react: path.resolve('./node_modules/react'),
      'react-dom': path.resolve('./node_modules/react-dom')
    }
  },
  server: {
    allowedHosts: ['photobathic-unbackward-matha.ngrok-free.dev'],
    proxy: {
      '/employee': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      '/employees': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
