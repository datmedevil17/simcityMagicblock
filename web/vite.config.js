import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  // Set the base directory for Vercel deployment
  base: '/',

  // Set the project root directory (relative to the config file)
  root: './src',

  // Set the directory to serve static files from (relative to the root)
  publicDir: '../public',
  
  // Set the build output directory
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  plugins: [
    react(),
  ],
  define: {
    'process.env': {},
    'global': 'window',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})