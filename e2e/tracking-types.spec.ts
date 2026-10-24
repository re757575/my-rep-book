import type { Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'

async function addExercise(page: Page, name: string) {
  await page.getByRole('button', { name: '加入動作' }).click()
  const dialog = page.getByRole('dialog', { name: '加入動作' })
  await dialog.getByRole('searchbox', { name: '搜尋動作' }).fill(name)
  await dialog.getByRole('button', { name: new RegExp(`^${name}`) }).click()
  await expect(dialog).toBeHidden()
  return page.getByRole('region', { name })
}

test('記錄跑步機與引體向上；不合法的輸入顯示錯誤且重新整理後沒有被保存', async ({ page }) => {
  await page.goto('./')

  const treadmill = await addExercise(page, '跑步機')
  const distance = treadmill.getByRole('textbox', { name: '第 1 組距離（km）' })
  const duration = treadmill.getByRole('textbox', { name: '第 1 組時間（mm:ss）' })
  await expect(distance).toHaveAttribute('inputmode', 'decimal')
  await expect(duration).toHaveAttribute('inputmode', 'numeric')
  await distance.pressSequentially('5.25')
  // 手機的數字鍵盤沒有冒號：只打數字，最後兩位是秒
  await duration.pressSequentially('2500')

  const pullUp = await addExercise(page, '引體向上')
  const reps = pullUp.getByRole('textbox', { name: '第 1 組次數' })
  await reps.pressSequentially('12')
  await reps.fill('0')
  await expect(reps).toHaveAttribute('aria-invalid', 'true')
  await expect(pullUp.getByText('請輸入 1–9999 的整數')).toBeVisible()
  await expect(pullUp.getByRole('textbox', { name: '第 1 組額外負重（kg）' })).toHaveValue('')

  await page.reload()

  await expect(distance).toHaveValue('5.25')
  await expect(duration).toHaveValue('25:00')
  await expect(reps).toHaveValue('12')
  await expect(pullUp.getByText('請輸入 1–9999 的整數')).toHaveCount(0)
})
