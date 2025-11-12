import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    cssMinify: 'esbuild', // ✅ use esbuild instead of lightningcss
    rollupOptions: {},    // ensure fallback to Rollup
  },
})
