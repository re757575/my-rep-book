import type { Page } from '@playwright/test'
import { backupFixture, fixtureWorkout } from '../src/test/backupFixture.ts'
import { chooseBackupFile, importBackup } from './backup.ts'
import { expect, test } from './fixtures.ts'

/** 今天的槓鈴臥推：兩組與備註 */
function benchCard(page: Page) {
  const card = page.getByRole('region', { name: '槓鈴臥推' })
  return {
    card,
    weight: (n: number) => card.getByRole('textbox', { name: `第 ${n} 組重量（kg）` }),
    reps: (n: number) => card.getByRole('textbox', { name: `第 ${n} 組次數` }),
    note: card.getByRole('textbox', { name: '備註' }),
  }
}

async function expectRecordedBench(page: Page) {
  await page.goto('./')
  const bench = benchCard(page)
  await expect(bench.weight(1)).toHaveValue('60')
  await expect(bench.reps(1)).toHaveValue('8')
  await expect(bench.weight(2)).toHaveValue('62.5')
  await expect(bench.reps(2)).toHaveValue('6')
  await expect(bench.note).toHaveValue('左肩不適')
  await expect(page.getByRole('region', { name: '每日摘要' }).getByLabel('總訓練量')).toHaveText(
    '855 kg',
  )
}

// E2E-05：記錄資料 → 匯出 → 清空 → 匯入 → 資料一致；匯入錯誤檔案時顯示錯誤且資料不變
test('E2E-05 記錄資料、匯出、清空、匯入後資料一致；匯入錯誤檔案時資料不變', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('button', { name: '加入動作' }).click()
  const dialog = page.getByRole('dialog', { name: '加入動作' })
  await dialog.getByRole('searchbox', { name: '搜尋動作' }).fill('臥推')
  await dialog.getByRole('button', { name: /^槓鈴臥推/ }).click()
  await expect(dialog).toBeHidden()
  const bench = benchCard(page)
  await bench.weight(1).fill('60')
  await bench.reps(1).fill('8')
  await bench.card.getByRole('button', { name: '新增一組' }).click()
  await bench.weight(2).fill('62.5')
  await bench.reps(2).fill('6')
  await bench.note.fill('左肩不適')

  // 匯出
  await page.goto('settings')
  const lastExportedAt = page.getByLabel('上次匯出時間')
  await expect(lastExportedAt).toHaveText('尚未匯出')
  const downloading = page.waitForEvent('download')
  await page.getByRole('button', { name: '匯出資料' }).click()
  const download = await downloading
  expect(download.suggestedFilename()).toBe('my-rep-book-backup-20261024-1200.json')
  const backupPath = await download.path()
  await expect(lastExportedAt).toHaveText('2026/10/24 12:00')

  // 清空：刪除整個資料庫（App 的連線會在收到 versionchange 時自動關閉）
  await page.evaluate(async () => {
    localStorage.clear()
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase('my-rep-book')
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  })
  await page.goto('./')
  await expect(page.getByRole('button', { name: '加入動作' })).toBeVisible()
  await expect(bench.card).toHaveCount(0)

  // 匯入剛才匯出的檔案
  await importBackup(page, { path: backupPath })
  await expectRecordedBench(page)

  // 匯入錯誤的檔案：顯示原因，資料不變
  await chooseBackupFile(page, { content: '{ 這不是備份檔' })
  await expect(page.getByRole('alert')).toHaveText('無法匯入：檔案不是有效的 JSON')
  await expect(page.getByRole('alertdialog')).toHaveCount(0)
  await expectRecordedBench(page)
})

test('匯入 fixture 備份檔建立歷史資料', async ({ page }) => {
  await importBackup(page, {
    content: backupFixture({
      workouts: [
        fixtureWorkout('2026-10-20', [
          {
            exerciseId: 'barbell-bench-press',
            sets: [{ type: 'weight_reps', weightKg: 60, reps: 8 }],
          },
        ]),
      ],
    }),
  })

  await page.goto('history')
  await page.getByRole('button', { name: /10月20日/ }).click()
  const detail = page.getByRole('region', { name: '10/20（二）' })
  await expect(detail.getByRole('article', { name: '槓鈴臥推' })).toContainText('60kg×8')
})
