import { readFileSync } from 'node:fs'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
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

const BASE = '/my-rep-book/'

/**
 * 預先載入 Geist 的拉丁字型（PRD §7：LCP < 2.5 秒）。字型檔原本要等 CSS 下載、解析後才開始下載，
 * 而今天頁的 LCP 元素（日期標題）的數字用的就是它；在 index.html 加上 preload，讓它與 JS 同時下載。
 * 中文字 Geist 沒有字形，用的是系統字型，所以只預先載入 latin 子集。
 */
function preloadLatinFont(): Plugin {
  return {
    name: 'preload-latin-font',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_, { bundle }) {
        const font = Object.values(bundle ?? {}).find((file) =>
          /geist-latin-wght-normal-.*\.woff2$/.test(file.fileName),
        )
        if (!font) throw new Error('找不到 Geist 的 latin 字型檔，無法預先載入')
        return [
          {
            tag: 'link',
            attrs: {
              rel: 'preload',
              href: `${BASE}${font.fileName}`,
              as: 'font',
              type: 'font/woff2',
              crossorigin: '',
            },
            injectTo: 'head-prepend',
          },
        ]
      },
    },
  }
}

/** E2E 用來模擬「部署了新版本」的 cookie 名稱（`e2e/pwa.spec.ts`） */
const E2E_SW_VERSION_COOKIE = 'e2e-sw-version'

/**
 * 只在 `vite preview`（E2E）作用：帶有 `e2e-sw-version` cookie 的瀏覽器拿到內容不同的 sw.js，
 * 模擬部署了新版本，用來驗證「有新版本」提示。cookie 只存在設定它的 browser context，
 * 平行執行的其他測試不受影響。Playwright 的 route 攔不到 Service Worker 本身的請求，所以改在伺服器端處理。
 * 正式環境（GitHub Pages 靜態檔）沒有這段。
 */
function simulateNewServiceWorker(): Plugin {
  return {
    name: 'e2e-simulate-new-service-worker',
    configurePreviewServer(server) {
      const swFile = path.resolve(server.config.root, server.config.build.outDir, 'sw.js')
      const cookiePattern = new RegExp(`(?:^|;\\s*)${E2E_SW_VERSION_COOKIE}=([^;]+)`)
      server.middlewares.use((req, res, next) => {
        const version = req.headers.cookie?.match(cookiePattern)?.[1]
        if (!version || req.url?.split('?')[0] !== `${BASE}sw.js`) return next()
        res.setHeader('Content-Type', 'text/javascript')
        res.setHeader('Cache-Control', 'no-cache')
        res.end(`${readFileSync(swFile, 'utf8')}\n// ${E2E_SW_VERSION_COOKIE}=${version}\n`)
      })
    },
  }
}

/** 設定頁顯示的 App 版本號：來自 package.json 的 version，由 `npm run release` 更新 */
const { version } = JSON.parse(
  readFileSync(path.resolve(import.meta.dirname, 'package.json'), 'utf8'),
) as { version: string }

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  base: BASE,
  plugins: [
    react(),
    tailwindcss(),
    spaFallback404(),
    preloadLatinFont(),
    simulateNewServiceWorker(),
    // PWA（US-20、PRD §8.4）：預先快取 App shell 與所有資源，離線也能使用；
    // 有新版本時由 UpdatePrompt 提示，使用者按「重新整理」才更新（registerType: 'prompt'）
    VitePWA({
      registerType: 'prompt',
      // 由 UpdatePrompt 的 useRegisterSW 註冊，不另外注入註冊程式
      injectRegister: false,
      // 圖示已由下方 globPatterns 收進預先快取，不用再加一次
      includeManifestIcons: false,
      manifest: {
        name: 'My Rep Book',
        short_name: 'Rep Book',
        description: '個人健身紀錄：資料存在本機，可離線使用',
        lang: 'zh-Hant-TW',
        // 與 Vite 的 base、Router 的 basename 一致
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        theme_color: '#171717',
        background_color: '#ffffff',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // 預設只快取 js、css、html；字型與圖示也要離線可用
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // 404.html 只給 GitHub Pages 處理第一次直接開啟的深層連結，Service Worker 用不到
        globIgnores: ['404.html'],
        // 離線時開啟任何路由都回傳 index.html，再交給 React Router
        navigateFallback: 'index.html',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // CI 的 runner 較慢，接縫 A 的整個 App 測試偶爾超過預設的 5 秒而擋住部署；本機維持預設
    testTimeout: process.env.CI ? 15_000 : 5_000,
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
