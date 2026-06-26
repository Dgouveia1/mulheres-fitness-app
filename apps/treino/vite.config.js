import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  // Lê o .env da raiz do monorepo (creds Supabase + URLs dos apps).
  envDir: path.resolve(__dirname, '../..'),
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
    // Garante uma única instância de React/Router entre app e @emf/shared.
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  // @emf/shared é código-fonte JSX do workspace: não pré-empacotar.
  optimizeDeps: { exclude: ['@emf/shared'] },
  server: { port: 3003 },
})
