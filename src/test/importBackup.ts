import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { toast } from 'sonner'
import { expect } from 'vitest'
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

const DONE_MESSAGE = '匯入完成'

/** 關閉畫面上的 toast，等「匯入完成」消失 */
async function dismissToasts() {
  toast.dismiss()
  await waitFor(() => expect(screen.queryByText(DONE_MESSAGE)).not.toBeInTheDocument())
}

/**
 * 在設定頁匯入備份檔並確認覆蓋，等到這次匯入顯示「匯入完成」。
 *
 * sonner 的 toast 存在模組層級，`reload()` 後會重播還沒消失的 toast：
 * 上一次匯入的「匯入完成」若還在，直接等它會在這次匯入完成前就返回，
 * 接著 `reload()` 或測試結束會關閉資料庫，中斷還在進行的匯入。所以先關掉舊的 toast。
 */
export async function importBackup(user: UserEvent, content: unknown) {
  await dismissToasts()
  await chooseBackupFile(user, content)
  const dialog = await screen.findByRole('alertdialog', { name: '匯入並覆蓋目前的資料？' })
  await user.click(within(dialog).getByRole('button', { name: '匯入' }))
  await screen.findByText(DONE_MESSAGE)
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
  // 不讓這次的「匯入完成」在重新渲染後重播，干擾測試本身
  await dismissToasts()
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  window.history.pushState({}, '', `${base}${route}`)
  return reload()
}
