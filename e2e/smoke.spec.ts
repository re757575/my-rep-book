import { backupFixture } from '../src/test/backupFixture.ts'
import { importBackup } from './backup.ts'
import { expect, test } from './fixtures.ts'

/** 各分頁的頁面標題；今天頁的標題是今天的日期 */
const TAB_HEADINGS = [
  ['歷史', '歷史'],
  ['動作庫', '動作庫'],
  ['設定', '設定'],
  ['今天', '10/24（六）'],
] as const

test('點底部分頁可以切換頁面', async ({ page }) => {
  await page.goto('./')
  const tabs = page.getByRole('navigation', { name: '主要分頁' })

  await expect(page.getByRole('heading', { level: 1, name: '10/24（六）' })).toBeVisible()

  for (const [tab, heading] of TAB_HEADINGS) {
    await tabs.getByRole('link', { name: tab }).click()

    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
    await expect(tabs.getByRole('link', { name: tab })).toHaveAttribute('aria-current', 'page')
  }
})

test('toast 顯示在底部分頁上方，不會擋住分頁', async ({ page }) => {
  await importBackup(page, { content: backupFixture() })
  const toast = page.getByRole('listitem').filter({ hasText: '匯入完成' })
  const tabs = page.getByRole('navigation', { name: '主要分頁' })

  // 等 toast 滑入的動畫結束再量位置
  await toast.evaluate((el) =>
    Promise.all(el.getAnimations().map((animation) => animation.finished)),
  )
  const toastBox = await toast.boundingBox()
  const tabsBox = await tabs.boundingBox()
  expect(toastBox!.y + toastBox!.height).toBeLessThanOrEqual(tabsBox!.y)

  // toast 還在的時候也能直接點分頁
  await tabs.getByRole('link', { name: '今天' }).click({ timeout: 2_000 })
  await expect(page.getByRole('heading', { level: 1, name: '10/24（六）' })).toBeVisible()
  await expect(toast).toBeVisible()
})
