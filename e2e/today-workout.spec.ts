import { expect, test } from './fixtures.ts'

// E2E-01：今天加入槓鈴臥推，記錄 3 組，重新整理後資料仍在，摘要正確
test('E2E-01 今天加入槓鈴臥推，記錄 3 組，重新整理後資料仍在，摘要正確', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { level: 1, name: '10/24（六）' })).toBeVisible()

  await page.getByRole('button', { name: '加入動作' }).click()
  const dialog = page.getByRole('dialog', { name: '加入動作' })
  await dialog.getByRole('searchbox', { name: '搜尋動作' }).fill('臥推')
  await dialog.getByRole('button', { name: /^槓鈴臥推/ }).click()
  await expect(dialog).toBeHidden()
  await expect(page).toHaveURL(/\/my-rep-book\/$/)

  const card = page.getByRole('region', { name: '槓鈴臥推' })
  const weight = (n: number) => card.getByRole('textbox', { name: `第 ${n} 組重量（kg）` })
  const reps = (n: number) => card.getByRole('textbox', { name: `第 ${n} 組次數` })

  await expect(weight(1)).toHaveValue('')
  await expect(weight(1)).toHaveAttribute('inputmode', 'decimal')
  await expect(reps(1)).toHaveAttribute('inputmode', 'numeric')

  await weight(1).fill('60')
  await reps(1).fill('8')
  await card.getByRole('button', { name: '新增一組' }).click()
  await expect(weight(2)).toHaveValue('60')
  await expect(reps(2)).toHaveValue('8')
  await card.getByRole('button', { name: '新增一組' }).click()
  await weight(3).fill('62.5')
  await reps(3).fill('6')

  for (const target of [weight(1), reps(1), card.getByRole('button', { name: '新增一組' })]) {
    const box = await target.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(44)
    expect(box?.width).toBeGreaterThanOrEqual(44)
  }

  await page.reload()

  await expect(weight(1)).toHaveValue('60')
  await expect(reps(1)).toHaveValue('8')
  await expect(weight(2)).toHaveValue('60')
  await expect(reps(2)).toHaveValue('8')
  await expect(weight(3)).toHaveValue('62.5')
  await expect(reps(3)).toHaveValue('6')
  await expect(card.getByRole('textbox', { name: /第 4 組/ })).toHaveCount(0)

  // Playwright 不計算 definition 的名稱，改用 aria-labelledby 指向的 dt 文字以 getByLabel 取
  const summary = page.getByRole('region', { name: '每日摘要' })
  await expect(summary.getByLabel('動作數')).toHaveText('1')
  await expect(summary.getByLabel('正式組數')).toHaveText('3')
  await expect(summary.getByLabel('總訓練量')).toHaveText('1,335 kg')
  await expect(summary.getByLabel('有氧總時間')).toHaveText('00:00')
})
