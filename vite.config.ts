import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

/**
 * GitHub Pages 不支援 rewrite（PRD §8.4）：把建置後的 index.html 複製成 404.html，
 * 讓直接開啟深層連結時也能載入 SPA，再交給 React Router 處理路由。
 */
function spaFallback404(): Plugin {
  return {
    name: 'spa-fallback-404',
    apply: 'build',
    enforce: 'post',
    generateBundle(_, bundle) {
      const index = bundle['index.html']
      if (index?.type !== 'asset') {
        this.error('找不到建置後的 index.html，無法產生 404.html')
      }
      this.emitFile({ type: 'asset', fileName: '404.html', source: index.source })
    },
  }
}

export default defineConfig({
  base: '/my-rep-book/',
  plugins: [react(), tailwindcss(), spaFallback404()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/domain/**/*.ts'],
      exclude: ['src/domain/**/*.test.ts'],
      thresholds: {
        'src/domain/**/*.ts': { lines: 80 },
      },
    },
  },
})
