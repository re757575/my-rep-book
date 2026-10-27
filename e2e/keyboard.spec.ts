import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'

// PRD §7、US-83：所有操作都能用鍵盤完成。這裡只用鍵盤（Tab、Enter、輸入文字）完成主要流程：
// 加入動作並記錄一組。

/**
 * 按 Tab 直到焦點落在 `target`。WebKit 跟 macOS Safari 一樣，Tab 預設只在表單欄位間移動，
 * 要按 Option+Tab 才會停在按鈕與連結（等同 Safari「按 Tab 鍵以標示網頁上的每個項目」設定）。
 */
async function tabTo(page: Page, target: Locator, key: string) {
  for (let i = 0; i < 40; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return
    await page.keyboard.press(key)
  }
  throw new Error('按 Tab 找不到目標元素')
}

test('只用鍵盤加入動作並記錄一組，重新整理後仍在', async ({ page, browserName }) => {
  const tab = browserName === 'webkit' ? 'Alt+Tab' : 'Tab'
  await page.goto('./')
  await expect(page.getByRole('heading', { level: 1, name: '10/24（六）' })).toBeVisible()

  await tabTo(page, page.getByRole('button', { name: '加入動作' }), tab)
  await page.keyboard.press('Enter')

  const dialog = page.getByRole('dialog', { name: '加入動作' })
  const search = dialog.getByRole('searchbox', { name: '搜尋動作' })
  await expect(dialog).toBeVisible()
  await tabTo(page, search, tab)
  await page.keyboard.type('槓鈴臥推')
  const bench = dialog.getByRole('button', { name: /^槓鈴臥推/ })
  await expect(bench).toBeVisible()
  await tabTo(page, bench, tab)
  await page.keyboard.press('Enter')
  await expect(dialog).toBeHidden()

  const card = page.getByRole('region', { name: '槓鈴臥推' })
  const weight = card.getByRole('textbox', { name: '第 1 組重量（kg）' })
  const reps = card.getByRole('textbox', { name: '第 1 組次數' })
  await tabTo(page, weight, tab)
  await page.keyboard.type('60')
  await tabTo(page, reps, tab)
  await page.keyboard.type('8')

  // 組類型也能用鍵盤切換：每按一次 Space 換成下一個（熱身 → 遞減 → 力竭 → 正式）
  const setType = card.getByRole('button', { name: /^第 1 組類型：/ })
  await tabTo(page, setType, tab)
  for (const label of ['熱身', '遞減', '力竭', '正式']) {
    await page.keyboard.press('Space')
    await expect(setType).toHaveAccessibleName(`第 1 組類型：${label}`)
  }

  await page.reload()
  await expect(weight).toHaveValue('60')
  await expect(reps).toHaveValue('8')
  await expect(page.getByRole('region', { name: '每日摘要' }).getByLabel('正式組數')).toHaveText(
    '1',
  )
})
