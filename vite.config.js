import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

const allowedHosts = ['ngdc.cncb.ac.cn', '192.168.164.19']

const apiProxy = {
  '/idp-lnod/api': {
    target: 'http://localhost:8010',
    changeOrigin: true,
    rewrite: p => p.replace(/^\/idp-lnod/, '')
  },
  '/api': {
    target: 'http://localhost:8010',
    changeOrigin: true
  }
}

export default defineConfig({
  base: '/idp-lnod/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts,
    proxy: apiProxy
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts,
    proxy: apiProxy
  }
})
