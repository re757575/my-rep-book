import type { Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'
import { unlockDay } from './unlockDay.ts'

/**
 * 從加入動作選單搜尋並加入槓鈴臥推；搜尋時不顯示「最近使用」，清單裡只有一個同名按鈕。
 * 非今天的訓練頁預設鎖定，先解鎖
 */
async function addBench(page: Page) {
  await unlockDay(page)
  await page.getByRole('button', { name: '加入動作' }).click()
  const dialog = page.getByRole('dialog', { name: '加入動作' })
  await dialog.getByRole('searchbox', { name: '搜尋動作' }).fill('槓鈴臥推')
  await dialog.getByRole('button', { name: /^槓鈴臥推/ }).click()
  await expect(dialog).toBeHidden()
  return page.getByRole('region', { name: '槓鈴臥推' })
}

// E2E-02：歷史資料透過補記建立。10/20 記錄熱身組與三個正式組 → 10/24 加入同一個動作，
// 顯示上次紀錄並預填第一個正式組；切到 10/15 加入同一個動作，沒有上次紀錄。
test('E2E-02 補記 10/20 後，10/24 顯示上次紀錄並預填，10/15 沒有上次紀錄', async ({ page }) => {
  await page.goto('day/2026-10-20')
  await expect(page.getByRole('heading', { level: 1, name: '10/20（二）' })).toBeVisible()

  const history = await addBench(page)
  const weight = (n: number) => history.getByRole('textbox', { name: `第 ${n} 組重量（kg）` })
  const reps = (n: number) => history.getByRole('textbox', { name: `第 ${n} 組次數` })
  const warmup = (n: number) => history.getByRole('button', { name: `第 ${n} 組熱身` })
  const addSet = history.getByRole('button', { name: '新增一組' })

  await weight(1).fill('40')
  await reps(1).fill('10')
  await warmup(1).click()
  await expect(warmup(1)).toHaveAttribute('aria-pressed', 'true')
  const toggleBox = await warmup(1).boundingBox()
  expect(toggleBox?.height).toBeGreaterThanOrEqual(44)
  expect(toggleBox?.width).toBeGreaterThanOrEqual(44)

  // 新增一組連同熱身標記一起複製，改回正式組
  await addSet.click()
  await expect(warmup(2)).toHaveAttribute('aria-pressed', 'true')
  await warmup(2).click()
  await expect(warmup(2)).toHaveAttribute('aria-pressed', 'false')
  await weight(2).fill('60')
  await reps(2).fill('8')
  await addSet.click()
  await expect(weight(3)).toHaveValue('60')
  await addSet.click()
  await weight(4).fill('62.5')
  await reps(4).fill('6')

  await page.getByRole('button', { name: '回到今天' }).click()
  await expect(page.getByRole('heading', { level: 1, name: '10/24（六）' })).toBeVisible()

  const today = await addBench(page)
  await expect(today.getByText('上次（10/20）：60kg×8、60kg×8、62.5kg×6')).toBeVisible()
  await expect(today.getByRole('textbox', { name: '第 1 組重量（kg）' })).toHaveValue('60')
  await expect(today.getByRole('textbox', { name: '第 1 組次數' })).toHaveValue('8')
  await expect(today.getByRole('button', { name: '第 1 組熱身' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )

  await page.goto('day/2026-10-15')
  await expect(page.getByRole('heading', { level: 1, name: '10/15（四）' })).toBeVisible()

  const earlier = await addBench(page)
  await expect(earlier.getByRole('textbox', { name: '第 1 組重量（kg）' })).toHaveValue('')
  await expect(earlier.getByRole('textbox', { name: '第 1 組次數' })).toHaveValue('')
  await expect(earlier.getByText(/^上次/)).toHaveCount(0)
})
