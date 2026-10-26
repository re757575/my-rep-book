import { expect, test } from './fixtures.ts'
import { unlockDay } from './unlockDay.ts'

// E2E-04：切到昨天（預設鎖定）解鎖後補記一個動作，重新整理後仍在，月曆上昨天出現標點且明細正確；
// 嘗試前往未來日期被導回今天。
test('E2E-04 切到昨天補記槓鈴臥推，重新整理後仍在，月曆標點且明細正確', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('heading', { level: 1, name: '10/24（六）' })).toBeVisible()
  await expect(page.getByRole('button', { name: '後一天' })).toBeDisabled()

  await page.getByRole('button', { name: '前一天' }).click()
  await expect(page.getByRole('heading', { level: 1, name: '10/23（五）' })).toBeVisible()
  await expect(page).toHaveURL(/\/my-rep-book\/day\/2026-10-23$/)

  // 非今天預設鎖定，解鎖後才能補記
  await expect(page.getByRole('button', { name: '鎖定', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByRole('button', { name: '加入動作' })).toHaveCount(0)
  await unlockDay(page)

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

  await page
    .getByRole('navigation', { name: '主要分頁' })
    .getByRole('link', { name: '歷史', exact: true })
    .click()
  const calendar = page.getByRole('grid', { name: '2026年10月' })
  const yesterday = calendar.getByRole('button', { name: /10月23日/ })
  await expect(yesterday).toHaveAccessibleName(/有訓練/)
  await expect(calendar.getByRole('button', { name: /10月22日/ })).not.toHaveAccessibleName(
    /有訓練/,
  )

  await yesterday.click()
  const detail = page.getByRole('region', { name: '10/23（五）' })
  const exercise = detail.getByRole('article', { name: '槓鈴臥推' })
  await expect(exercise.getByRole('list', { name: '組' }).getByRole('listitem')).toHaveText([
    '60kg×8',
  ])
  await expect(detail.getByRole('region', { name: '每日摘要' }).getByLabel('總訓練量')).toHaveText(
    '480 kg',
  )

  await detail.getByRole('link', { name: '編輯' }).click()
  await expect(page.getByRole('heading', { level: 1, name: '10/23（五）' })).toBeVisible()
  await expect(page).toHaveURL(/\/my-rep-book\/day\/2026-10-23$/)
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
