import { test as base } from '@playwright/test'
import { FIXED_TODAY } from '../src/test/fixedToday.ts'

/**
 * 所有 E2E 都從這裡 import `test` 與 `expect`：
 * - 「今天」以 Clock API 固定在 2026-10-24（計時器照常運作）
 * - 每個測試都是全新的 browser context，IndexedDB 一開始就是空的
 */
export const test = base.extend<{ fixedClock: void }>({
  fixedClock: [
    async ({ page }, use) => {
      await page.clock.setFixedTime(FIXED_TODAY)
      await use()
    },
    { auto: true },
  ],
})

export { expect } from '@playwright/test'
