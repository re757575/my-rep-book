import { expect, test } from './fixtures.ts'

test('點底部分頁可以切換頁面', async ({ page }) => {
  await page.goto('./')
  const tabs = page.getByRole('navigation', { name: '主要分頁' })

  await expect(page.getByRole('heading', { level: 1, name: '今天' })).toBeVisible()

  for (const name of ['歷史', '動作庫', '設定', '今天']) {
    await tabs.getByRole('link', { name }).click()

    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
    await expect(tabs.getByRole('link', { name })).toHaveAttribute('aria-current', 'page')
  }
})
