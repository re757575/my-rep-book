import { expect, test } from './fixtures.ts'

// jsdom 沒有真的 prefers-color-scheme 與 CSS，「跟隨系統」與實際的背景色在真實瀏覽器驗證
test('主題預設跟隨系統；選擇淺色後即使系統是深色也維持淺色，重新整理後仍有效', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('settings')
  const html = page.locator('html')
  const theme = page.getByRole('radiogroup', { name: '主題' })

  await expect(theme.getByRole('radio', { name: '跟隨系統' })).toBeChecked()
  await expect(html).toHaveClass(/\bdark\b/)
  const darkBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)

  await theme.getByRole('radio', { name: '淺色' }).click()
  await expect(html).not.toHaveClass(/\bdark\b/)
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor))
    .not.toBe(darkBackground)

  await page.reload()
  await expect(theme.getByRole('radio', { name: '淺色' })).toBeChecked()
  await expect(html).not.toHaveClass(/\bdark\b/)

  // 改回跟隨系統後，系統切換深淺色時立即跟著變
  await theme.getByRole('radio', { name: '跟隨系統' }).click()
  await expect(html).toHaveClass(/\bdark\b/)
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(html).not.toHaveClass(/\bdark\b/)
})

test('toast 跟著選擇的主題', async ({ page }) => {
  await page.goto('settings')
  await page.getByRole('radiogroup', { name: '主題' }).getByRole('radio', { name: '深色' }).click()
  await expect(page.locator('html')).toHaveClass(/\bdark\b/)

  await page
    .getByRole('navigation', { name: '主要分頁' })
    .getByRole('link', { name: '今天' })
    .click()
  await page.getByRole('button', { name: '加入動作' }).click()
  const dialog = page.getByRole('dialog', { name: '加入動作' })
  await dialog.getByRole('searchbox', { name: '搜尋動作' }).fill('槓鈴臥推')
  await dialog.getByRole('button', { name: /^槓鈴臥推/ }).click()
  await page.getByRole('button', { name: '刪除第 1 組' }).click()

  await expect(page.getByText('已刪除一組')).toBeVisible()
  await expect(page.locator('[data-sonner-toaster]')).toHaveAttribute('data-sonner-theme', 'dark')
})
