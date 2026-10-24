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
