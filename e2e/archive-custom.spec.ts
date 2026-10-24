import type { Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'

async function createCustomExercise(page: Page, name: string) {
  await page.goto('exercises/new')
  await page.getByRole('textbox', { name: '中文名稱' }).fill(name)
  await page.getByRole('group', { name: '主要部位' }).getByRole('checkbox', { name: '胸' }).click()
  await page.getByRole('radiogroup', { name: '器材' }).getByRole('radio', { name: '器械' }).click()
  await page
    .getByRole('radiogroup', { name: '記錄類型' })
    .getByRole('radio', { name: '重量×次數' })
    .click()
  await page.getByRole('button', { name: '儲存' }).click()
  await expect(page.getByRole('heading', { name: '動作庫' })).toBeVisible()
}

async function openDetail(page: Page, name: string) {
  await page.getByRole('searchbox', { name: '搜尋動作' }).fill(name)
  await page
    .getByRole('list', { name: '動作清單' })
    .getByRole('link', { name: new RegExp(name) })
    .click()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
}

test('已有紀錄的自訂動作：記錄類型鎖定、封存後不在選單但訓練頁仍顯示，可取消封存', async ({
  page,
}) => {
  await createCustomExercise(page, 'Smith 臥推')
  await page.goto('./')
  await page.getByRole('button', { name: '加入動作' }).click()
  await page
    .getByRole('dialog', { name: '加入動作' })
    .getByRole('button', { name: /^Smith 臥推/ })
    .click()
  await expect(page.getByRole('region', { name: 'Smith 臥推' })).toBeVisible()

  await page.goto('exercises')
  await openDetail(page, 'Smith 臥推')
  // 「是否已有紀錄」非同步載入：先等「封存」出現，再確認沒有「刪除」
  await expect(page.getByRole('button', { name: '封存' })).toBeVisible()
  await expect(page.getByRole('button', { name: '刪除' })).toHaveCount(0)
  await page.getByRole('link', { name: '編輯' }).click()
  await expect(page.getByText('已有紀錄，無法變更記錄類型')).toBeVisible()
  await expect(
    page
      .getByRole('radiogroup', { name: '記錄類型' })
      .getByRole('radio', { name: '次數', exact: true }),
  ).toBeDisabled()
  await page.getByRole('link', { name: '取消' }).click()

  await page.getByRole('button', { name: '封存' }).click()
  await expect(page.getByText('已封存')).toBeVisible()

  await page.goto('./')
  await expect(page.getByRole('region', { name: 'Smith 臥推' })).toBeVisible()
  await page.getByRole('button', { name: '加入動作' }).click()
  const dialog = page.getByRole('dialog', { name: '加入動作' })
  await dialog.getByRole('searchbox', { name: '搜尋動作' }).fill('smith')
  await expect(dialog.getByText('找不到符合的動作')).toBeVisible()

  await page.goto('exercises')
  await page.getByText('顯示已隱藏／已封存').click()
  await openDetail(page, 'Smith 臥推')
  await page.getByRole('button', { name: '取消封存' }).click()
  await expect(page.getByRole('button', { name: '封存' })).toBeVisible()
  await expect(page.getByText('已封存')).toHaveCount(0)
})

test('沒有紀錄的自訂動作：確認對話框確認後永久刪除', async ({ page }) => {
  await createCustomExercise(page, 'Smith 臥推')
  await openDetail(page, 'Smith 臥推')

  await page.getByRole('button', { name: '刪除' }).click()
  const confirm = page.getByRole('alertdialog', { name: '刪除「Smith 臥推」？' })
  await expect(confirm).toBeVisible()
  await confirm.getByRole('button', { name: '刪除' }).click()

  await expect(page.getByRole('heading', { name: '動作庫' })).toBeVisible()
  await page.reload()
  await page.getByText('顯示已隱藏／已封存').click()
  await page.getByRole('searchbox', { name: '搜尋動作' }).fill('smith')
  await expect(page.getByText('找不到符合的動作')).toBeVisible()
})
