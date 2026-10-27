import { backupFixture, fixtureWorkout } from '../src/test/backupFixture.ts'
import { importBackup } from './backup.ts'
import { expect, test } from './fixtures.ts'

/** 臥推三次：10/10 最重 60、10/15 最重 62.5、10/20 最重 60 */
const FIXTURE = backupFixture({
  workouts: [
    ['2026-10-10', 60],
    ['2026-10-15', 62.5],
    ['2026-10-20', 60],
  ].map(([date, weightKg]) =>
    fixtureWorkout(String(date), [
      {
        exerciseId: 'barbell-bench-press',
        sets: [{ type: 'weight_reps', weightKg: Number(weightKg), reps: 8 }],
      },
    ]),
  ),
})

// 點圖上的位置要有真實的版面（jsdom 量不到），所以在 E2E 驗證：點擊與滑過選取最近的一次，
// 橫軸依實際的日期間隔排列（10/10、10/15、10/20 等距，所以中間那次在正中央）。
test('進度圖表：點圖上的位置選取最近的一次，數值與日期顯示在圖上方', async ({ page }) => {
  await importBackup(page, { content: FIXTURE })
  await page.goto('exercises/barbell-bench-press')

  const section = page.getByRole('region', { name: '進度' })
  const readout = section.getByRole('status')
  await expect(readout).toHaveText('60 kg2026/10/20（二）')

  const chart = section.getByRole('group', { name: /折線圖/ })
  // 滑鼠座標是相對於可視範圍，圖要先捲進畫面才點得到
  await chart.scrollIntoViewIfNeeded()
  const box = (await chart.boundingBox())!
  // 圖的繪圖區在整張圖的左 48／340 到右 12／340 之間，高度在上 12／180 到下 24／180 之間
  const plotLeft = box.x + (box.width * 48) / 340
  const plotRight = box.x + box.width - (box.width * 12) / 340
  const y = box.y + box.height / 2

  await page.mouse.click(plotLeft + 2, y)
  await expect(readout).toHaveText('60 kg2026/10/10（六）')

  await page.mouse.click((plotLeft + plotRight) / 2, y)
  await expect(readout).toHaveText('62.5 kg2026/10/15（四）')

  await page.mouse.click(plotRight - 2, y)
  await expect(readout).toHaveText('60 kg2026/10/20（二）')

  // 切換指標後，圖上方改顯示那個指標的值
  await section.getByRole('radio', { name: '訓練量' }).click()
  await expect(readout).toHaveText('480 kg2026/10/20（二）')
})
