import { expect, test } from './fixtures.ts'

test('動作庫可以搜尋與依分類篩選，觸控目標至少 44px', async ({ page }) => {
  await page.goto('exercises')
  const search = page.getByRole('searchbox', { name: '搜尋動作' })
  const list = page.getByRole('list', { name: '動作清單' })

  await expect(list.getByRole('listitem')).toHaveCount(66)

  await search.fill('bench')
  await expect(list.getByText('槓鈴臥推')).toBeVisible()
  await expect(list.getByText('啞鈴臥推')).toBeVisible()
  await expect(list.getByText('窄握臥推')).toBeVisible()

  await search.fill('')
  const shoulders = page.getByRole('radio', { name: '肩', exact: true })
  await shoulders.click()
  await expect(shoulders).toHaveAttribute('aria-checked', 'true')
  await expect(list.getByText('聳肩')).toBeVisible()

  const targets = [search, ...(await page.getByRole('radio').all())]
  for (const target of targets) {
    await target.scrollIntoViewIfNeeded()
    const box = await target.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(44)
    expect(box?.width).toBeGreaterThanOrEqual(44)
  }
})

test('選了分類才有「包含次要部位」開關，開啟後多出次要部位屬於該分類的動作，觸控目標至少 44px', async ({
  page,
}) => {
  await page.goto('exercises')
  const list = page.getByRole('list', { name: '動作清單' })
  const toggle = page.getByRole('switch', { name: '包含次要部位' })
  await expect(toggle).toHaveCount(0)

  await page.getByRole('radio', { name: '手臂：三頭', exact: true }).click()
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await expect(list.getByText('窄握臥推')).toBeVisible()
  await expect(list.getByText('槓鈴臥推')).toHaveCount(0)

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  await expect(list.getByText('槓鈴臥推')).toBeVisible()

  // 整列（含文字標籤）是觸控目標
  const row = await page.getByText('包含次要部位', { exact: true }).boundingBox()
  expect(row?.height).toBeGreaterThanOrEqual(44)
})
