// 首次載入 LCP 檢查（PRD §7、issue #20）：在 Lighthouse 的手機版預設設定下
// （模擬中階手機：4 倍 CPU 降速、Slow 4G 網路節流），App 首頁的 LCP 要 < 2.5 秒。
//
// 對建置結果（dist/）啟動 vite preview，用 Playwright 的 Chromium 跑 Lighthouse 數次，取 LCP 中位數。
// 模擬節流的結果仍會隨機器負載浮動，所以不放進 CI，上線前或改動首頁後手動執行。
//
// 用法：npm run build && npm run lighthouse
import { chromium } from '@playwright/test'
import lighthouse from 'lighthouse'
import { preview } from 'vite'

const LCP_BUDGET_MS = 2500
const RUNS = 3
const DEBUGGING_PORT = 9223

const server = await preview({ preview: { port: 0, strictPort: false, open: false } })
const url = server.resolvedUrls?.local[0]
if (!url) throw new Error('vite preview 沒有回報網址')

const browser = await chromium.launch({
  channel: 'chromium',
  args: [`--remote-debugging-port=${DEBUGGING_PORT}`],
})
try {
  const results: { lcp: number; fcp: number; score: number }[] = []
  for (let run = 1; run <= RUNS; run++) {
    // 不帶 config 就是 Lighthouse 的手機版預設：模擬節流（simulate）、行動裝置畫面
    const result = await lighthouse(url, {
      port: DEBUGGING_PORT,
      onlyCategories: ['performance'],
      logLevel: 'error',
    })
    if (!result) throw new Error('Lighthouse 沒有回傳結果')
    const { audits, categories } = result.lhr
    const lcp = audits['largest-contentful-paint'].numericValue ?? NaN
    const fcp = audits['first-contentful-paint'].numericValue ?? NaN
    const score = Math.round((categories.performance.score ?? 0) * 100)
    results.push({ lcp, fcp, score })
    console.log(
      `第 ${run} 次：LCP ${(lcp / 1000).toFixed(2)} 秒、FCP ${(fcp / 1000).toFixed(2)} 秒、效能分數 ${score}`,
    )
  }
  const median = results.map(({ lcp }) => lcp).sort((a, b) => a - b)[Math.floor(RUNS / 2)]
  console.log(`LCP 中位數 ${(median / 1000).toFixed(2)} 秒，預算 ${LCP_BUDGET_MS / 1000} 秒`)
  if (!(median < LCP_BUDGET_MS)) {
    console.error('LCP 超出預算')
    process.exitCode = 1
  }
} finally {
  await browser.close()
  await server.close()
}
