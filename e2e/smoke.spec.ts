import { expect, test } from './fixtures.ts'

/** 各分頁的頁面標題；今天頁的標題是今天的日期 */
const TAB_HEADINGS = [
  ['歷史', '歷史'],
  ['動作庫', '動作庫'],
  ['設定', '設定'],
  ['今天', '10/24（六）'],
] as const

test('點底部分頁可以切換頁面', async ({ page }) => {
  await page.goto('./')
  const tabs = page.getByRole('navigation', { name: '主要分頁' })

  await expect(page.getByRole('heading', { level: 1, name: '10/24（六）' })).toBeVisible()

  for (const [tab, heading] of TAB_HEADINGS) {
    await tabs.getByRole('link', { name: tab }).click()

    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
    await expect(tabs.getByRole('link', { name: tab })).toHaveAttribute('aria-current', 'page')
  }
})
