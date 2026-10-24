import { expect, test } from './fixtures.ts'

// E2E-04（前半）：切到昨天補記一個動作，重新整理後仍在；嘗試前往未來日期被導回今天。
// 月曆標點與日明細的斷言由歷史 ticket 補上。
test('E2E-04 切到昨天補記槓鈴臥推，重新整理後仍在', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { level: 1, name: '10/24（六）' })).toBeVisible()
  await expect(page.getByRole('button', { name: '後一天' })).toBeDisabled()

  await page.getByRole('button', { name: '前一天' }).click()
  await expect(page.getByRole('heading', { level: 1, name: '10/23（五）' })).toBeVisible()
  await expect(page).toHaveURL(/\/my-rep-book\/day\/2026-10-23$/)

  await page.getByRole('button', { name: '加入動作' }).click()
  const dialog = page.getByRole('dialog', { name: '加入動作' })
  await dialog.getByRole('searchbox', { name: '搜尋動作' }).fill('臥推')
  await dialog.getByRole('button', { name: /^槓鈴臥推/ }).click()
  const card = page.getByRole('region', { name: '槓鈴臥推' })
  await card.getByRole('textbox', { name: '第 1 組重量（kg）' }).fill('60')
  await card.getByRole('textbox', { name: '第 1 組次數' }).fill('8')

  await page.reload()

  await expect(page.getByRole('heading', { level: 1, name: '10/23（五）' })).toBeVisible()
  await expect(card.getByRole('textbox', { name: '第 1 組重量（kg）' })).toHaveValue('60')
  await expect(card.getByRole('textbox', { name: '第 1 組次數' })).toHaveValue('8')

  await page.getByRole('button', { name: '回到今天' }).click()
  await expect(page.getByRole('heading', { level: 1, name: '10/24（六）' })).toBeVisible()
  await expect(page).toHaveURL(/\/my-rep-book\/$/)
  await expect(page.getByRole('button', { name: '加入動作' })).toBeVisible()
  await expect(card).toHaveCount(0)
})

test('E2E-04 從日期選擇器跳到過去的日期，未來日期不能選', async ({ page }) => {
  await page.goto('./')

  await page.getByRole('button', { name: '選擇日期' }).click()
  const picker = page.getByRole('dialog', { name: '選擇日期' })
  await expect(picker.getByRole('button', { name: /10月25日/ })).toBeDisabled()
  await picker.getByRole('button', { name: /10月20日/ }).click()

  await expect(page.getByRole('heading', { level: 1, name: '10/20（二）' })).toBeVisible()
  await expect(page).toHaveURL(/\/my-rep-book\/day\/2026-10-20$/)
  await expect(picker).toBeHidden()
})

test('E2E-04 從網址進入未來日期時被導回今天，並顯示說明', async ({ page }) => {
  await page.goto('day/2026-10-25')

  await expect(page.getByRole('heading', { level: 1, name: '10/24（六）' })).toBeVisible()
  await expect(page).toHaveURL(/\/my-rep-book\/$/)
  await expect(page.getByText('無法記錄未來的日期')).toBeVisible()
})
