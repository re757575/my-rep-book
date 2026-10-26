import type { Page } from '@playwright/test'
import { expect } from './fixtures.ts'

/** 非今天的訓練頁預設鎖定：要修改紀錄前先取消「鎖定」（按下狀態的 Toggle） */
export async function unlockDay(page: Page) {
  const lock = page.getByRole('button', { name: '鎖定', exact: true })
  if ((await lock.getAttribute('aria-pressed')) === 'true') await lock.click()
  await expect(lock).toHaveAttribute('aria-pressed', 'false')
}
