import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from './fixtures.ts'

// playwright.config.ts 的 webServer 會先 build，所以這裡讀得到最新的建置產物
const distDir = path.resolve(import.meta.dirname, '../dist')
const readDist = (file: string) => readFileSync(path.join(distDir, file), 'utf8')

test('建置產物的 404.html 與 index.html 相同', () => {
  expect(readDist('404.html')).toBe(readDist('index.html'))
})

for (const [route, heading, tab = heading] of [
  ['history', '歷史'],
  ['history/body-weight', '體重紀錄', '歷史'],
  ['history/ai-prompt', 'AI 提示詞', '歷史'],
  ['exercises', '動作庫'],
  ['exercises/new', '新增自訂動作', '動作庫'],
  ['settings', '設定'],
  ['day/2026-10-20', '10/20（二）', '今天'],
] as const) {
  test(`在 GitHub Pages 直接開啟深層連結 ${route} 時畫面正常顯示`, async ({ page }) => {
    // GitHub Pages 沒有 rewrite：找不到檔案的路徑會以 404 狀態碼回傳 404.html。
    // vite preview 會自動 fallback 到 index.html，所以這裡攔截導覽請求，模擬 Pages 的行為。
    await page.route(`**/my-rep-book/${route}`, (r) =>
      r.fulfill({ status: 404, contentType: 'text/html', body: readDist('404.html') }),
    )

    await page.goto(route)

    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
    await expect(
      page.getByRole('navigation', { name: '主要分頁' }).getByRole('link', { name: tab }),
    ).toHaveAttribute('aria-current', 'page')
  })
}
