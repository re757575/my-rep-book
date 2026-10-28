import { backupFixture, fixtureWorkout } from '../src/test/backupFixture.ts'
import { importBackup } from './backup.ts'
import { expect, test } from './fixtures.ts'

/** 10/24 的 67.5kg×8 估算 1RM 最高（85.5 kg），是「來源的一組」與日期都很長的情況 */
const FIXTURE = backupFixture({
  workouts: [
    fixtureWorkout('2026-10-20', [
      {
        exerciseId: 'barbell-bench-press',
        sets: [{ type: 'weight_reps', weightKg: 70, reps: 3 }],
      },
    ]),
    fixtureWorkout('2026-10-24', [
      {
        exerciseId: 'barbell-bench-press',
        sets: [{ type: 'weight_reps', weightKg: 67.5, reps: 8 }],
      },
    ]),
  ],
})

// 換行發生在真實的版面（jsdom 量不到），所以在 E2E 驗證：手機寬度下，卡片裡每一行說明都只占一行，
// 日期不會被拆開（iPhone 14 寬 390 px，Pixel 7 寬 412 px）。
test('個人紀錄卡片：每一行說明都不換行，日期不會被拆成兩半', async ({ page }) => {
  await importBackup(page, { content: FIXTURE })
  await page.goto('exercises/barbell-bench-press')

  const section = page.getByRole('region', { name: '個人紀錄' })
  await expect(section).toBeVisible()
  await section.scrollIntoViewIfNeeded()

  const oneRepMax = section.getByLabel('估算 1RM')
  await expect(oneRepMax.locator('span')).toHaveText(['85.5 kg', '67.5kg×8', '2026/10/24（六）'])
  await expect(section.getByLabel('最大重量').locator('span')).toHaveText([
    '70kg×3',
    '2026/10/20（二）',
  ])

  // 每一行說明的高度不超過一行的行高（換行後高度會是兩倍）
  const lines = section.locator('dd span.text-xs')
  const count = await lines.count()
  expect(count).toBe(3)
  for (let i = 0; i < count; i++) {
    const { height, lineHeight } = await lines.nth(i).evaluate((el) => ({
      height: el.getBoundingClientRect().height,
      lineHeight: parseFloat(getComputedStyle(el).lineHeight),
    }))
    expect(height, `第 ${i + 1} 行說明的高度`).toBeLessThan(lineHeight * 1.5)
  }
})
