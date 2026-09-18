import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' —— 使构建产物可以在 GitHub Pages 的子路径下直接运行
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
