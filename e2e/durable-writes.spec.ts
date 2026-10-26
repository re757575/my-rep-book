import type { Page } from '@playwright/test'
import { FIXED_TODAY } from '../src/test/fixedToday.ts'
import { expect, test } from './fixtures.ts'

async function addBenchPress(page: Page) {
  await page.getByRole('button', { name: '加入動作' }).click()
  const dialog = page.getByRole('dialog', { name: '加入動作' })
  await dialog.getByRole('searchbox', { name: '搜尋動作' }).fill('臥推')
  await dialog.getByRole('button', { name: /^槓鈴臥推/ }).click()
  await expect(dialog).toBeHidden()
  return page.getByRole('region', { name: '槓鈴臥推' })
}

test('輸入組的數值後立刻重新整理，重新整理後顯示剛輸入的值', async ({ page }) => {
  await page.goto('./')
  const card = await addBenchPress(page)
  const weight = card.getByRole('textbox', { name: '第 1 組重量（kg）' })
  const reps = card.getByRole('textbox', { name: '第 1 組次數' })

  await weight.pressSequentially('62.5')
  await reps.pressSequentially('12')
  await page.reload()

  await expect(weight).toHaveValue('62.5')
  await expect(reps).toHaveValue('12')
})

test('輸入備註後立刻重新整理，重新整理後顯示剛輸入的備註', async ({ page }) => {
  await page.goto('./')
  const card = await addBenchPress(page)
  const note = card.getByRole('textbox', { name: '備註' })

  await note.pressSequentially('左肩不適')
  await page.reload()

  await expect(note).toHaveValue('左肩不適')
})

test('輸入體重後立刻重新整理，重新整理後顯示剛輸入的體重', async ({ page }) => {
  await page.goto('./')
  const bodyWeight = page.getByRole('textbox', { name: '體重（kg）' })

  await bodyWeight.pressSequentially('72.5')
  await page.reload()

  await expect(bodyWeight).toHaveValue('72.5')
})

test('切到背景後分頁被關閉，重新開啟時剛輸入的值仍在', async ({ page, context }) => {
  await page.goto('./')
  const card = await addBenchPress(page)
  await card.getByRole('textbox', { name: '第 1 組重量（kg）' }).pressSequentially('80')
  await card.getByRole('textbox', { name: '第 1 組次數' }).pressSequentially('5')

  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false }))
  })
  await page.close()

  const reopened = await context.newPage()
  await reopened.clock.setFixedTime(FIXED_TODAY)
  await reopened.goto('./')
  const reopenedCard = reopened.getByRole('region', { name: '槓鈴臥推' })
  await expect(reopenedCard.getByRole('textbox', { name: '第 1 組重量（kg）' })).toHaveValue('80')
  await expect(reopenedCard.getByRole('textbox', { name: '第 1 組次數' })).toHaveValue('5')
})
