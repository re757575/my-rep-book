import { expect, test } from './fixtures.ts'

// E2E-03：在加入動作選單中新增 distance_duration 類型的自訂動作，加入今天的訓練並記錄一組
test('從加入動作選單新增 distance_duration 類型的自訂動作，記錄一組後在動作庫搜尋得到', async ({
  page,
}) => {
  await page.goto('./')
  await page.getByRole('button', { name: '加入動作' }).click()
  await page
    .getByRole('dialog', { name: '加入動作' })
    .getByRole('button', { name: '新增自訂動作' })
    .click()

  const form = page.getByRole('dialog', { name: '新增自訂動作' })
  await form.getByRole('textbox', { name: '中文名稱' }).fill('戶外跑步')
  await form.getByRole('textbox', { name: '英文名稱' }).fill('Outdoor Run')
  await form
    .getByRole('group', { name: '主要部位' })
    .getByRole('checkbox', { name: '有氧／全身' })
    .click()
  await form.getByRole('radiogroup', { name: '器材' }).getByRole('radio', { name: '其他' }).click()
  await form
    .getByRole('radiogroup', { name: '記錄類型' })
    .getByRole('radio', { name: '距離＋時間' })
    .click()
  await form.getByRole('button', { name: '儲存' }).click()
  await expect(form).toBeHidden()

  const card = page.getByRole('region', { name: '戶外跑步' })
  await card.getByRole('textbox', { name: '第 1 組距離（km）' }).pressSequentially('5.2')
  await card.getByRole('textbox', { name: '第 1 組時間（mm:ss）' }).pressSequentially('2830')

  await page
    .getByRole('navigation', { name: '主要分頁' })
    .getByRole('link', { name: '動作庫' })
    .click()
  await page.getByRole('searchbox', { name: '搜尋動作' }).fill('outdoor')
  const list = page.getByRole('list', { name: '動作清單' })
  await expect(list.getByRole('listitem')).toHaveCount(1)
  await list.getByRole('link', { name: /戶外跑步/ }).click()
  await expect(page.getByRole('heading', { name: '戶外跑步' })).toBeVisible()
  await expect(page.getByRole('definition').filter({ hasText: '距離＋時間' })).toBeVisible()

  // 重新載入今天頁，確認記錄的一組已經存下來
  await page.goto('./')
  await expect(card.getByRole('textbox', { name: '第 1 組距離（km）' })).toHaveValue('5.2')
  await expect(card.getByRole('textbox', { name: '第 1 組時間（mm:ss）' })).toHaveValue('28:30')

  await page.getByRole('button', { name: '加入動作' }).click()
  await expect(
    page
      .getByRole('dialog', { name: '加入動作' })
      .getByRole('region', { name: '最近使用' })
      .getByRole('button'),
  ).toHaveText([/^戶外跑步/])
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
