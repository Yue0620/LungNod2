import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8010',
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/api/, '') // <--- 删掉这一行！让 /api 传给后端
      }
    }
  }
})