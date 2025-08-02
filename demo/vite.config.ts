import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@voisync': resolve(__dirname, '../src')
    }
  },
  server: {
    fs: {
      allow: [
        resolve(__dirname, '..'),
      ]
    }
  },
  publicDir: resolve(__dirname, '../assets'),
  optimizeDeps: {
    include: ['vue', 'openapi-fetch']
  }
});