import { expect, test } from './fixtures.ts'

test('隱藏預設動作後重新整理仍保留，打開「顯示已隱藏／已封存」可取消隱藏', async ({ page }) => {
  await page.goto('exercises')
  const list = page.getByRole('list', { name: '動作清單' })
  await expect(list.getByRole('listitem')).toHaveCount(66)

  await list.getByRole('link', { name: /槓鈴臥推/ }).click()
  await expect(page.getByRole('heading', { name: '槓鈴臥推' })).toBeVisible()
  await expect(page.getByRole('definition').filter({ hasText: '重量×次數' })).toBeVisible()
  await page.getByRole('button', { name: '隱藏' }).click()
  await expect(page.getByRole('button', { name: '取消隱藏' })).toBeVisible()

  await page.getByRole('link', { name: '返回動作庫' }).click()
  await expect(list.getByRole('listitem')).toHaveCount(65)

  await page.reload()
  await expect(list.getByRole('listitem')).toHaveCount(65)
  await expect(list.getByText('槓鈴臥推')).toHaveCount(0)

  const toggle = page.getByRole('switch', { name: '顯示已隱藏／已封存' })
  await page.getByText('顯示已隱藏／已封存').click()
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  await expect(list.getByRole('listitem')).toHaveCount(66)

  await list.getByRole('link', { name: /槓鈴臥推/ }).click()
  await page.getByRole('button', { name: '取消隱藏' }).click()
  await expect(page.getByRole('button', { name: '隱藏' })).toBeVisible()

  await page.getByRole('link', { name: '返回動作庫' }).click()
  await expect(list.getByRole('listitem')).toHaveCount(66)
})
