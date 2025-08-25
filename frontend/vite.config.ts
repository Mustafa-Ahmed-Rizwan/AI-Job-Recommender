import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: '.', // Set root to current directory
  server: {
    port: 3000,
    open: true,
    host: true, // Allow external access
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'), // Explicitly point to index.html
      },
    },
  },
  publicDir: 'public', // Ensure public directory exists
})