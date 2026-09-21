import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  base: '/Sleeve/',
  plugins: [
    react(),
    legacy({
      targets: ['iOS >= 13', 'Safari >= 13', 'Chrome >= 80'],
      modernPolyfills: true,
    }),
  ],
  server: { host: true },
})
