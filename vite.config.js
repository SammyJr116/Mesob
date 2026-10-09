import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            if (id.includes('@radix-ui') || id.includes('cmdk')) {
              return 'vendor-ui';
            }
            return 'vendor';
          }
        },
      },
    },
  },
  server: {
    host: true,
    watch: {
      ignored: ['**/*.md', '**/.git/**', '**/dist/**'],
    },
  },
  preview: {
    host: true,
  },
})