// 首次載入的 JS（gzip）預算檢查（PRD §7、issue #20）：CI 在 build 之後執行。
//
// 「首次載入的 JS」以真實瀏覽器量：對建置結果（dist/）啟動 vite preview，以 Chromium 打開 App 首頁
// （預設進入今天的訓練頁），等畫面渲染完成後，把這次載入請求的所有 JS 檔案逐一以 gzip 壓縮後加總。
// 這樣入口 chunk、它靜態 import 的 chunk，以及啟動時才動態載入的 chunk（例如 workbox-window）都會算進去；
// 只有切到其他分頁才載入的 chunk 不算。
//
// 用法：npm run build && npm run check:bundle-size
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
import { chromium } from '@playwright/test'
import { preview } from 'vite'

/** 預算：250 KB（以 1 KB = 1000 bytes 計，與 Vite 的建置報告一致） */
const BUDGET_BYTES = 250 * 1000
const BASE_PATH = '/my-rep-book/'
const DIST = path.resolve(import.meta.dirname, '../dist')

const server = await preview({ preview: { port: 0, strictPort: false, open: false } })
const origin = server.resolvedUrls?.local[0]?.replace(/\/my-rep-book\/?$/, '').replace(/\/$/, '')
if (!origin) throw new Error('vite preview 沒有回報網址')

const browser = await chromium.launch()
try {
  // 擋掉 Service Worker：它會在背景預先快取所有 chunk，不能算進首次載入
  const context = await browser.newContext({ serviceWorkers: 'block' })
  const page = await context.newPage()
  const scripts = new Set<string>()
  page.on('response', (response) => {
    if (response.request().resourceType() === 'script')
      scripts.add(new URL(response.url()).pathname)
  })
  await page.goto(`${origin}${BASE_PATH}`)
  // 今天的訓練頁渲染完成（h1 是日期），並等啟動時的動態 import 都載入完
  await page.getByRole('heading', { level: 1 }).waitFor()
  await page.waitForLoadState('networkidle')

  const rows = await Promise.all(
    [...scripts].sort().map(async (pathname) => {
      const file = path.join(DIST, pathname.slice(BASE_PATH.length))
      const source = await readFile(file)
      return { file: path.relative(DIST, file), raw: source.length, gzip: gzipSync(source).length }
    }),
  )
  const total = rows.reduce((sum, row) => sum + row.gzip, 0)
  const kb = (bytes: number) => `${(bytes / 1000).toFixed(2)} KB`

  console.log('首次載入的 JS（gzip）：')
  for (const row of rows) console.log(`  ${row.file}  ${kb(row.raw)} → ${kb(row.gzip)}`)
  console.log(`合計 ${kb(total)}，預算 ${kb(BUDGET_BYTES)}`)

  if (rows.length === 0) {
    console.error('沒有量到任何 JS，請確認已先執行 npm run build')
    process.exitCode = 1
  } else if (total >= BUDGET_BYTES) {
    console.error(`超出預算 ${kb(total - BUDGET_BYTES)}：請把不是首頁需要的程式改成動態載入`)
    process.exitCode = 1
  }
} finally {
  await browser.close()
  await server.close()
}
