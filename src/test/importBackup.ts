import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { renderApp } from './renderApp'

/** 在設定頁選擇備份檔。`content` 為物件時轉成 JSON，字串則原樣當作檔案內容 */
export async function chooseBackupFile(
  user: UserEvent,
  content: unknown,
  fileName = 'backup.json',
) {
  const text = typeof content === 'string' ? content : JSON.stringify(content)
  const input = await screen.findByLabelText('選擇備份檔')
  await user.upload(input, new File([text], fileName, { type: 'application/json' }))
}

/** 在設定頁匯入備份檔並確認覆蓋，等到顯示「匯入完成」 */
export async function importBackup(user: UserEvent, content: unknown) {
  await chooseBackupFile(user, content)
  const dialog = await screen.findByRole('alertdialog', { name: '匯入並覆蓋目前的資料？' })
  await user.click(within(dialog).getByRole('button', { name: '匯入' }))
  await screen.findByText('匯入完成')
}

/**
 * 接縫 A：先匯入 fixture 備份檔建立資料，再從 `route` 開始渲染 App。
 * 需要歷史資料的測試用它，不必透過 UI 逐筆輸入。
 *
 * @example
 * const { user } = await renderAppWithBackup(
 *   backupFixture({ workouts: [fixtureWorkout('2026-10-20', [...])] }),
 *   '/history',
 * )
 */
export async function renderAppWithBackup(content: unknown, route = '/') {
  const { user, reload } = renderApp('/settings')
  await importBackup(user, content)
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  window.history.pushState({}, '', `${base}${route}`)
  return reload()
}
