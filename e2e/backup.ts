import type { Page } from '@playwright/test'
import { expect } from './fixtures.ts'

/** 備份檔：已下載檔案的路徑，或要匯入的內容（物件會轉成 JSON，字串原樣當作檔案內容） */
export type BackupSource = { path: string } | { content: unknown }

/** 在設定頁按「匯入資料」並選擇備份檔 */
export async function chooseBackupFile(page: Page, source: BackupSource) {
  await page.goto('settings')
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: '匯入資料' }).click()
  const files =
    'path' in source
      ? source.path
      : {
          name: 'backup.json',
          mimeType: 'application/json',
          buffer: Buffer.from(
            typeof source.content === 'string' ? source.content : JSON.stringify(source.content),
          ),
        }
  await (await chooser).setFiles(files)
}

/**
 * 匯入備份檔並確認覆蓋，等到顯示「匯入完成」。
 * 需要歷史資料的 E2E 用它搭配 `src/test/backupFixture.ts` 建立資料，不必透過 UI 逐筆輸入。
 */
export async function importBackup(page: Page, source: BackupSource) {
  await chooseBackupFile(page, source)
  const dialog = page.getByRole('alertdialog', { name: '匯入並覆蓋目前的資料？' })
  await dialog.getByRole('button', { name: '匯入' }).click()
  await expect(page.getByText('匯入完成')).toBeVisible()
}
