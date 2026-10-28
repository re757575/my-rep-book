import { backupFixture, fixtureWorkout } from '../src/test/backupFixture.ts'
import { importBackup } from './backup.ts'
import { expect, test } from './fixtures.ts'

/** 10/20：臥推熱身 40×10、正式 60×8 兩組，平板支撐 90 秒 */
const FIXTURE = backupFixture({
  workouts: [
    fixtureWorkout('2026-10-20', [
      {
        exerciseId: 'barbell-bench-press',
        sets: [
          { type: 'weight_reps', weightKg: 40, reps: 10, setType: 'warmup' },
          { type: 'weight_reps', weightKg: 60, reps: 8 },
          { type: 'weight_reps', weightKg: 60, reps: 8 },
        ],
      },
      { exerciseId: 'plank', sets: [{ type: 'duration', durationSec: 90 }] },
    ]),
  ],
})

// 對話框在手機瀏覽器的版面（鍵盤、捲動、觸控）只有 E2E 看得到：
// 從歷史存成範本，再回今天從範本加入，上次紀錄預填第一組。
test('範本：從歷史的日明細存成範本，在今天從範本加入', async ({ page }) => {
  await importBackup(page, { content: FIXTURE })

  await page.goto('history')
  await page.getByRole('button', { name: /10月20日/ }).click()
  const detail = page.getByRole('region', { name: '10/20（二）' })
  await detail.getByRole('button', { name: '存成範本' }).click()
  const save = page.getByRole('dialog', { name: '存成範本' })
  await save.getByRole('textbox', { name: '範本名稱' }).fill('推日')
  await save.getByRole('button', { name: '儲存' }).click()
  await expect(page.getByText('已存成範本『推日』')).toBeVisible()
  await expect(save).toBeHidden()

  await page.goto('./')
  await page.getByRole('button', { name: '從範本加入' }).click()
  const picker = page.getByRole('dialog', { name: '從範本加入' })
  await expect(picker.getByRole('button', { name: /^推日/ })).toContainText('2 個動作 · 3 組')
  await picker.getByRole('button', { name: /^推日/ }).click()

  await expect(page.getByText('已加入『推日』的 2 個動作')).toBeVisible()
  const bench = page.getByRole('region', { name: '槓鈴臥推' })
  await expect(bench.getByRole('textbox', { name: '第 1 組重量（kg）' })).toHaveValue('60')
  await expect(bench.getByRole('textbox', { name: '第 2 組次數' })).toHaveValue('8')
  await expect(page.getByRole('region', { name: '平板支撐' })).toBeVisible()

  await page.getByRole('button', { name: '復原' }).click()
  await expect(page.getByRole('region', { name: '槓鈴臥推' })).toBeHidden()
})
