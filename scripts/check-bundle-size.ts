// 首次載入的 JS（gzip）檢查（PRD §7、issue #20）：CI 在 build 之後執行。
//
// 「首次載入的 JS」以真實瀏覽器量：對建置結果（dist/）啟動 vite preview，以 Chromium 打開 App 首頁
// （預設進入今天的訓練頁），等畫面渲染完成後，把這次載入請求的所有 JS 檔案逐一以 gzip 壓縮後加總。
// 這樣入口 chunk、它靜態 import 的 chunk，以及啟動後才動態載入的 chunk（workbox-window、閒置時預先載入的
// 加入動作選單）都會算進去，是偏保守的量法；只有切到其他分頁或打開日期選擇器等操作後才載入的 chunk 不算。
//
// 兩道檢查：
// - 預算：總量須 < 250 KB
// - 基準：和 scripts/bundle-baseline.json 相比，總量多超過 1 KB 就失敗，並列出變動的 chunk。
//   首頁開始用到原本只有動態載入頁才用的模組時，打包工具會改變 chunk 的切分，總量悄悄變大，
//   遠在超出預算之前就要知道。確定要變大時用 --update 更新基準，連同變更一起 commit
//
// 用法：npm run build && npm run check:bundle-size [-- --update]
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
import { chromium } from '@playwright/test'
import { preview } from 'vite'

/** 預算：250 KB（以 1 KB = 1000 bytes 計，與 Vite 的建置報告一致） */
const BUDGET_BYTES = 250 * 1000
/** 比基準多出超過這個量就失敗 */
const BASELINE_TOLERANCE_BYTES = 1000
const BASE_PATH = '/my-rep-book/'
const DIST = path.resolve(import.meta.dirname, '../dist')
const BASELINE_FILE = path.resolve(import.meta.dirname, 'bundle-baseline.json')

/** 同名的 chunk（例如好幾個 dist-*.js）合併成一筆 */
type ChunkSizes = Record<string, { count: number; gzipBytes: number }>
interface Baseline {
  totalGzipBytes: number
  chunks: ChunkSizes
}

const kb = (bytes: number) => `${(bytes / 1000).toFixed(2)} KB`
const signedKb = (bytes: number) => `${bytes >= 0 ? '+' : '-'}${kb(Math.abs(bytes))}`

/** 去掉 Vite 加的 8 字元 hash（hash 本身可能含 - 與 _），例如 labels-COKnXQ-h.js → labels */
function chunkName(file: string) {
  return path.basename(file).replace(/-[\w-]{8}\.js$/, '')
}

/** 和基準相比有變動的 chunk，變大最多的在前 */
function describeChanges(current: ChunkSizes, baseline: ChunkSizes): string[] {
  const names = [...new Set([...Object.keys(current), ...Object.keys(baseline)])]
  return names
    .map((name) => {
      const now = current[name] ?? { count: 0, gzipBytes: 0 }
      const before = baseline[name] ?? { count: 0, gzipBytes: 0 }
      return { name, now, before, delta: now.gzipBytes - before.gzipBytes }
    })
    .filter(({ now, before, delta }) => delta !== 0 || now.count !== before.count)
    .sort((a, b) => b.delta - a.delta)
    .map(({ name, now, before, delta }) => {
      const status = before.count === 0 ? '（新出現）' : now.count === 0 ? '（已消失）' : ''
      const count = now.count !== before.count ? ` ×${before.count} → ×${now.count}` : ''
      return `  ${name}${count}  ${kb(before.gzipBytes)} → ${kb(now.gzipBytes)}（${signedKb(delta)}）${status}`
    })
}

async function readBaseline(): Promise<Baseline | undefined> {
  try {
    return JSON.parse(await readFile(BASELINE_FILE, 'utf8')) as Baseline
  } catch {
    return undefined
  }
}

const update = process.argv.includes('--update')

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
  const chunks: ChunkSizes = {}
  for (const row of rows) {
    const entry = (chunks[chunkName(row.file)] ??= { count: 0, gzipBytes: 0 })
    entry.count += 1
    entry.gzipBytes += row.gzip
  }

  console.log('首次載入的 JS（gzip）：')
  for (const row of rows) console.log(`  ${row.file}  ${kb(row.raw)} → ${kb(row.gzip)}`)
  console.log(`合計 ${kb(total)}，預算 ${kb(BUDGET_BYTES)}`)

  if (rows.length === 0) {
    console.error('沒有量到任何 JS，請確認已先執行 npm run build')
    process.exitCode = 1
  } else if (total >= BUDGET_BYTES) {
    console.error(`超出預算 ${kb(total - BUDGET_BYTES)}：請把不是首頁需要的程式改成動態載入`)
    process.exitCode = 1
  } else if (update) {
    const baseline: Baseline = { totalGzipBytes: total, chunks }
    await writeFile(BASELINE_FILE, `${JSON.stringify(baseline, null, 2)}\n`)
    console.log(`已更新基準 ${path.relative(process.cwd(), BASELINE_FILE)}：${kb(total)}`)
  } else {
    const baseline = await readBaseline()
    if (!baseline) {
      console.error(`找不到基準 ${BASELINE_FILE}，請執行 npm run check:bundle-size -- --update`)
      process.exitCode = 1
    } else {
      const delta = total - baseline.totalGzipBytes
      console.log(`基準 ${kb(baseline.totalGzipBytes)}（${signedKb(delta)}）`)
      const changes = describeChanges(chunks, baseline.chunks)
      if (changes.length > 0) console.log(['和基準相比有變動的 chunk：', ...changes].join('\n'))
      if (delta > BASELINE_TOLERANCE_BYTES) {
        console.error(
          `比基準多 ${kb(delta)}，超過 ${kb(BASELINE_TOLERANCE_BYTES)}：先看上面變動的 chunk。` +
            '出現新的共用 chunk 通常是首頁開始用到原本只有動態載入頁才用的模組；' +
            '確定要變大時執行 npm run check:bundle-size -- --update 更新基準，連同變更一起 commit',
        )
        process.exitCode = 1
      } else if (delta < -BASELINE_TOLERANCE_BYTES) {
        console.log(
          `比基準少 ${kb(-delta)}：執行 npm run check:bundle-size -- --update 更新基準，之後的增加才量得準`,
        )
      }
    }
  }
} finally {
  await browser.close()
  await server.close()
}
