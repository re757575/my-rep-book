import type { Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'

/** 等 Service Worker 安裝並啟用完成（此時 App shell 與所有資源已預先快取） */
async function waitForServiceWorker(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
}

test('manifest：名稱、圖示、standalone，id、start_url 與 scope 都是 /my-rep-book/', async ({
  page,
}) => {
  await page.goto('./')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(href).not.toBeNull()

  const manifestUrl = new URL(href!, page.url())
  const response = await page.request.get(manifestUrl.href)
  expect(response.ok()).toBe(true)
  const manifest = await response.json()

  expect(manifest).toMatchObject({
    name: 'My Rep Book',
    short_name: 'Rep Book',
    display: 'standalone',
    id: '/my-rep-book/',
    start_url: '/my-rep-book/',
    scope: '/my-rep-book/',
  })
  const icons: { src: string; sizes: string; purpose?: string }[] = manifest.icons
  expect(icons.map((icon) => icon.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']))
  expect(icons.some((icon) => icon.purpose === 'maskable')).toBe(true)
  for (const icon of icons) {
    const iconResponse = await page.request.get(new URL(icon.src, manifestUrl).href)
    expect(iconResponse.ok(), icon.src).toBe(true)
    expect(iconResponse.headers()['content-type']).toBe('image/png')
  }
})

test('離線：首次載入後切換為離線，仍能記錄一組，重新整理後資料仍在', async ({ page, context }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { level: 1, name: '10/24（六）' })).toBeVisible()
  await waitForServiceWorker(page)

  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: '10/24（六）' })).toBeVisible()

  await page.getByRole('button', { name: '加入動作' }).click()
  const dialog = page.getByRole('dialog', { name: '加入動作' })
  await dialog.getByRole('searchbox', { name: '搜尋動作' }).fill('臥推')
  await dialog.getByRole('button', { name: /^槓鈴臥推/ }).click()
  const card = page.getByRole('region', { name: '槓鈴臥推' })
  await card.getByRole('textbox', { name: '第 1 組重量（kg）' }).fill('60')
  await card.getByRole('textbox', { name: '第 1 組次數' }).fill('8')

  await page.reload()

  await expect(card.getByRole('textbox', { name: '第 1 組重量（kg）' })).toHaveValue('60')
  await expect(card.getByRole('textbox', { name: '第 1 組次數' })).toHaveValue('8')
  await expect(page.getByRole('region', { name: '每日摘要' }).getByLabel('總訓練量')).toHaveText(
    '480 kg',
  )
})

test('離線：直接開啟深層路由也能正常顯示', async ({ page, context }) => {
  await page.goto('./')
  await waitForServiceWorker(page)
  await context.setOffline(true)

  await page.goto('history')
  await expect(page.getByRole('heading', { level: 1, name: '歷史' })).toBeVisible()
  await page.goto('day/2026-10-20')
  await expect(page.getByRole('heading', { level: 1, name: '10/20（二）' })).toBeVisible()
  await page.goto('exercises/barbell-bench-press')
  await expect(page.getByRole('heading', { level: 1, name: '槓鈴臥推' })).toBeVisible()
  await page.goto('settings')
  await expect(page.getByRole('heading', { level: 1, name: '設定' })).toBeVisible()
})

test('新版本：顯示「有新版本」toast，不自動重新整理；按「重新整理」才換成新版本', async ({
  page,
  context,
}) => {
  await page.goto('./')
  await waitForServiceWorker(page)

  // 模擬部署了新版本：帶這個 cookie 時 vite preview 回傳內容不同的 sw.js（見 vite.config.ts）。
  // Playwright 的 route 攔不到 Service Worker 本身的請求，所以不能用 route 改
  await context.addCookies([{ name: 'e2e-sw-version', value: '2', url: page.url() }])
  await page.reload()
  // Linux 的 WebKit 換頁後自動檢查更新時抓 sw.js 不帶 cookie，看不到新版；
  // 改由頁面主動檢查更新（App 每小時檢查一次走的也是這條路）
  await page.evaluate(async () => {
    await (await navigator.serviceWorker.getRegistration())?.update()
  })

  const toast = page.getByRole('listitem').filter({ hasText: '有新版本' })
  await expect(toast).toBeVisible()
  // 不會自動重新整理：在頁面上留個記號，過一會兒仍在
  await page.evaluate(() => {
    ;(window as unknown as { notReloaded: boolean }).notReloaded = true
  })
  await page.waitForTimeout(1_000)
  expect(await page.evaluate(() => 'notReloaded' in window)).toBe(true)
  await expect(toast).toBeVisible()

  const reloaded = page.waitForEvent('load')
  await toast.getByRole('button', { name: '重新整理' }).click()
  await reloaded

  await expect(page.getByRole('heading', { level: 1, name: '10/24（六）' })).toBeVisible()
  expect(await page.evaluate(() => 'notReloaded' in window)).toBe(false)
  await expect(page.getByText('有新版本')).toBeHidden()
})
