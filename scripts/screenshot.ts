// 截取 App 某個畫面的手機截圖，用來確認版面（測試只驗證行為，量不到「看起來對不對」）。
//
// 每次都是全新的瀏覽器：沒有舊的 Service Worker 與資料、不碰使用者自己的瀏覽器與剪貼簿；
// 「今天」固定在 2026-10-24（同 E2E），預設匯入 scripts/demoBackup.ts 的示範資料。
//
// 用法：npm run screenshot -- <路徑> [選項]
//   <路徑>              App 內的路徑，不含 base path，例如 history、exercises/barbell-bench-press；省略為今天
//   --device <名稱>     iphone（預設，iPhone 14／WebKit）或 pixel（Pixel 7／Chromium）
//   --theme <主題>      light（預設）或 dark
//   --fixture <檔案>    匯入這個備份檔，取代示範資料
//   --empty             不匯入任何資料
//   --click <名稱>      截圖前依序點擊這個名稱的按鈕、連結、選項或分頁，可重複，例如 --click 月
//   --storage <鍵=值>   載入前先寫入 localStorage，可重複，例如開啟強度記錄：
//                       --storage 'my-rep-book:effort-settings={"enabled":true,"scale":"rpe"}'
//   --viewport          只截可視範圍（預設截整頁）
//   --no-build          沿用現有的 dist/，不重新建置
//
// 截圖存在 test-results/screenshots/（已被 gitignore，不用刪）。
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { chromium, devices, webkit, type Page } from '@playwright/test'
import { build, preview } from 'vite'
import { importBackup, type BackupSource } from '../e2e/backup.ts'
import { FIXED_TODAY } from '../src/test/fixedToday.ts'
import { DEMO_BACKUP } from './demoBackup.ts'

const DEVICES = {
  iphone: { browser: webkit, descriptor: devices['iPhone 14'] },
  pixel: { browser: chromium, descriptor: devices['Pixel 7'] },
} as const
type DeviceName = keyof typeof DEVICES

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    device: { type: 'string', default: 'iphone' },
    theme: { type: 'string', default: 'light' },
    fixture: { type: 'string' },
    empty: { type: 'boolean', default: false },
    click: { type: 'string', multiple: true, default: [] },
    storage: { type: 'string', multiple: true, default: [] },
    viewport: { type: 'boolean', default: false },
    'no-build': { type: 'boolean', default: false },
  },
})

const route = (positionals[0] ?? '').replace(/^\/+/, '')
if (!(values.device in DEVICES))
  throw new Error(`--device 只能是 ${Object.keys(DEVICES).join('、')}`)
if (values.theme !== 'light' && values.theme !== 'dark')
  throw new Error('--theme 只能是 light 或 dark')
const device = DEVICES[values.device as DeviceName]

async function backupSource(): Promise<BackupSource | undefined> {
  if (values.empty) return undefined
  if (values.fixture) return { content: await readFile(path.resolve(values.fixture), 'utf8') }
  return { content: DEMO_BACKUP }
}

/** 點擊名稱完全相符的按鈕、連結、選項或分頁（第一個） */
async function clickByName(page: Page, name: string) {
  const roles = ['button', 'link', 'radio', 'tab', 'checkbox', 'switch'] as const
  const locator = roles
    .map((role) => page.getByRole(role, { name, exact: true }))
    .reduce((all, next) => all.or(next))
  await locator
    .first()
    .click({ timeout: 5_000 })
    .catch(() => {
      throw new Error(`找不到名稱為「${name}」的按鈕、連結、選項或分頁`)
    })
}

if (!values['no-build']) await build({ logLevel: 'warn' })
const server = await preview({ preview: { port: 0, strictPort: false, open: false } })
const baseURL = server.resolvedUrls?.local[0]
if (!baseURL) throw new Error('vite preview 沒有回報網址')

const browser = await device.browser.launch()
try {
  const context = await browser.newContext({
    ...device.descriptor,
    baseURL,
    colorScheme: values.theme,
    // 每次都從網路載入最新的建置，不經過 Service Worker
    serviceWorkers: 'block',
  })
  // 在每個畫面載入前寫入 localStorage（App 的畫面偏好存在這裡）
  const storage = values.storage.map((entry) => {
    const separator = entry.indexOf('=')
    if (separator === -1) throw new Error(`--storage 要寫成 鍵=值：${entry}`)
    return [entry.slice(0, separator), entry.slice(separator + 1)] as const
  })
  await context.addInitScript((entries) => {
    for (const [key, value] of entries) localStorage.setItem(key, value)
  }, storage)
  const page = await context.newPage()
  await page.clock.setFixedTime(FIXED_TODAY)

  const source = await backupSource()
  if (source) await importBackup(page, source)

  // 相對路徑：baseURL 已帶有 base path。整頁重新載入，「匯入完成」的 toast 不會留在截圖裡
  await page.goto(route)
  await page.getByRole('heading', { level: 1 }).first().waitFor()
  for (const name of values.click) await clickByName(page, name)
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  if (!values.viewport) {
    // 底部分頁是 position: fixed，整頁截圖時會停在第一個畫面的底部、蓋住中間的內容；改排在頁面最後
    await page.addStyleTag({
      content: 'nav[aria-label="主要分頁"] { position: static !important; }',
    })
  }

  const slug = [route.replaceAll('/', '_') || 'today', ...values.click].join('-')
  const file = path.resolve(
    import.meta.dirname,
    `../test-results/screenshots/${slug}-${values.device}-${values.theme}.png`,
  )
  await page.screenshot({ path: file, fullPage: !values.viewport, animations: 'disabled' })
  console.log(file)
} finally {
  await browser.close()
  await server.close()
}
