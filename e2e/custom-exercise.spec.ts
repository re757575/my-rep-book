import { expect, test } from './fixtures.ts'

// E2E-03（M1 範圍：不含加入今天訓練的部分）
test('新增 distance_duration 類型的自訂動作，動作庫可以搜尋到，重新整理後仍在', async ({
  page,
}) => {
  await page.goto('exercises')
  await page.getByRole('link', { name: '新增自訂動作' }).click()
  await expect(page.getByRole('heading', { name: '新增自訂動作' })).toBeVisible()

  await page.getByRole('textbox', { name: '中文名稱' }).fill('戶外跑步')
  await page.getByRole('textbox', { name: '英文名稱' }).fill('Outdoor Run')
  await page
    .getByRole('group', { name: '主要部位' })
    .getByRole('checkbox', { name: '有氧／全身' })
    .click()
  await page.getByRole('radiogroup', { name: '器材' }).getByRole('radio', { name: '其他' }).click()
  await page
    .getByRole('radiogroup', { name: '記錄類型' })
    .getByRole('radio', { name: '距離＋時間' })
    .click()
  await page.getByRole('button', { name: '儲存' }).click()

  await expect(page.getByRole('heading', { name: '動作庫' })).toBeVisible()
  const list = page.getByRole('list', { name: '動作清單' })
  await page.getByRole('searchbox', { name: '搜尋動作' }).fill('outdoor')
  await expect(list.getByRole('listitem')).toHaveCount(1)
  await expect(list.getByRole('link', { name: /戶外跑步/ })).toBeVisible()

  await page.reload()
  await page.getByRole('searchbox', { name: '搜尋動作' }).fill('戶外')
  await list.getByRole('link', { name: /戶外跑步/ }).click()
  await expect(page.getByRole('heading', { name: '戶外跑步' })).toBeVisible()
  await expect(page.getByRole('definition').filter({ hasText: '距離＋時間' })).toBeVisible()
})

test('同名動作無法送出；複製預設動作後以「{原名}（自訂）」建立並可編輯', async ({ page }) => {
  await page.goto('exercises/barbell-bench-press')
  await page.getByRole('link', { name: '複製為自訂動作' }).click()

  const name = page.getByRole('textbox', { name: '中文名稱' })
  await expect(name).toHaveValue('槓鈴臥推（自訂）')
  await name.fill(' 槓鈴臥推 ')
  await page.getByRole('button', { name: '儲存' }).click()
  await expect(page.getByText('已有同名動作')).toBeVisible()

  await name.fill('槓鈴臥推（自訂）')
  await page.getByRole('button', { name: '儲存' }).click()
  await expect(page.getByRole('heading', { name: '動作庫' })).toBeVisible()

  await page.getByRole('searchbox', { name: '搜尋動作' }).fill('（自訂）')
  await page.getByRole('list', { name: '動作清單' }).getByRole('link').click()
  await page.getByRole('link', { name: '編輯' }).click()
  await expect(page.getByRole('heading', { name: '編輯自訂動作' })).toBeVisible()
  await name.fill('Smith 臥推')
  await page.getByRole('radiogroup', { name: '器材' }).getByRole('radio', { name: '器械' }).click()
  await page.getByRole('button', { name: '儲存' }).click()

  await expect(page.getByRole('heading', { name: 'Smith 臥推' })).toBeVisible()
  await expect(page.getByRole('definition').filter({ hasText: '器械' })).toBeVisible()
})
