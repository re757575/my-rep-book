import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import {
  backupFixture,
  fixtureBodyWeight,
  fixtureCustomExercise,
  fixtureWorkout,
} from '@/test/backupFixture'
import { downloadCount, waitForDownloads } from '@/test/downloads'
import { FIXED_TODAY } from '@/test/fixedToday'
import { chooseBackupFile, importBackup, renderAppWithBackup } from '@/test/importBackup'
import { renderApp } from '@/test/renderApp'

/** 點底部的分頁 */
async function goToTab(user: UserEvent, tab: '今天' | '歷史' | '動作庫' | '設定') {
  const tabs = screen.getByRole('navigation', { name: '主要分頁' })
  await user.click(within(tabs).getByRole('link', { name: tab }))
}

/** 訓練頁上的訓練動作數（每個訓練動作的標題是 h2） */
function workoutExerciseCount() {
  return screen.queryAllByRole('heading', { level: 2 }).length
}

/** 從加入動作選單的全部動作清單加入一個動作，回傳該訓練動作的區塊 */
async function addExercise(user: UserEvent, name: string) {
  const countBefore = workoutExerciseCount()
  await user.click(await screen.findByRole('button', { name: '加入動作' }))
  const dialog = await screen.findByRole('dialog', { name: '加入動作' })
  const list = await within(dialog).findByRole('list', { name: '動作清單' })
  await user.click(within(list).getByRole('button', { name: new RegExp(`^${name}`) }))
  await waitFor(() => expect(workoutExerciseCount()).toBe(countBefore + 1))
  return screen.getByRole('region', { name })
}

/** 設定頁的「上次匯出時間」 */
async function lastExportedAt() {
  return (await screen.findByRole('definition', { name: '上次匯出時間' })).textContent
}

const NOW = FIXED_TODAY.toISOString()

describe('匯出資料', () => {
  it('從未匯出時顯示「尚未匯出」；匯出後下載含全部資料的備份檔，並更新上次匯出時間', async () => {
    const { user, reload } = renderApp()
    const bench = await addExercise(user, '槓鈴臥推')
    await user.type(within(bench).getByRole('textbox', { name: '第 1 組重量（kg）' }), '60')
    await user.type(within(bench).getByRole('textbox', { name: '第 1 組次數' }), '8')
    await user.type(within(bench).getByRole('textbox', { name: '備註' }), '左肩不適')

    await goToTab(user, '設定')
    const theme = await screen.findByRole('radiogroup', { name: '主題' })
    await user.click(within(theme).getByRole('radio', { name: '深色' }))
    await waitFor(() => expect(within(theme).getByRole('radio', { name: '深色' })).toBeChecked())
    expect(await lastExportedAt()).toBe('尚未匯出')

    await user.click(screen.getByRole('button', { name: '匯出資料' }))

    const [file] = await waitForDownloads(1)
    expect(file.fileName).toBe('my-rep-book-backup-20261024-1200.json')
    expect(JSON.parse(file.text)).toEqual({
      app: 'my-rep-book',
      schemaVersion: 3,
      exportedAt: NOW,
      data: {
        workouts: [
          {
            date: '2026-10-24',
            exercises: [
              {
                id: expect.any(String),
                exerciseId: 'barbell-bench-press',
                note: '左肩不適',
                sets: [
                  {
                    id: expect.any(String),
                    isWarmup: false,
                    values: { type: 'weight_reps', weightKg: 60, reps: 8 },
                  },
                ],
              },
            ],
            createdAt: NOW,
            updatedAt: NOW,
          },
        ],
        customExercises: [],
        hiddenPresetIds: [],
        bodyWeights: [],
        settings: { weightUnit: 'kg', theme: 'dark', heightCm: null, birthDate: null },
      },
    })
    await waitFor(async () => expect(await lastExportedAt()).toBe('2026/10/24 12:00'))

    reload()
    expect(await lastExportedAt()).toBe('2026/10/24 12:00')
  })
})

const runFixture = fixtureCustomExercise({
  id: 'custom-run',
  nameZh: '戶外跑步',
  trackingType: 'distance_duration',
})

/**
 * 10/20 做了槓鈴臥推（熱身 40×10、60×8）與戶外跑步，隱藏了哈克深蹲，重量單位 lb；
 * 10/19、10/20 記了體重，身高 175 cm，生日 1990/5/20
 */
const importedBackup = backupFixture({
  workouts: [
    fixtureWorkout('2026-10-20', [
      {
        exerciseId: 'barbell-bench-press',
        note: '握距加寬',
        sets: [
          { type: 'weight_reps', weightKg: 40, reps: 10, isWarmup: true },
          { type: 'weight_reps', weightKg: 60, reps: 8 },
        ],
      },
      {
        exerciseId: 'custom-run',
        sets: [{ type: 'distance_duration', distanceKm: 5, durationSec: 1800 }],
      },
    ]),
  ],
  customExercises: [runFixture],
  hiddenPresetIds: ['hack-squat'],
  bodyWeights: [fixtureBodyWeight('2026-10-19', 72.5), fixtureBodyWeight('2026-10-20', 72)],
  settings: { weightUnit: 'lb', theme: 'system', heightCm: 175, birthDate: '1990-05-20' },
})

/** 今天記錄槓鈴臥推 60kg×8，切到設定頁 */
async function recordTodayThenOpenSettings() {
  const app = renderApp()
  const bench = await addExercise(app.user, '槓鈴臥推')
  await app.user.type(within(bench).getByRole('textbox', { name: '第 1 組重量（kg）' }), '60')
  await app.user.type(within(bench).getByRole('textbox', { name: '第 1 組次數' }), '8')
  await goToTab(app.user, '設定')
  return app
}

describe('匯入資料', () => {
  it('確認後先下載目前資料的備份，再以匯入內容整份取代現有資料', async () => {
    const { user } = await recordTodayThenOpenSettings()

    await chooseBackupFile(user, importedBackup)
    const dialog = await screen.findByRole('alertdialog', { name: '匯入並覆蓋目前的資料？' })
    expect(dialog).toHaveAccessibleDescription(
      '匯入將覆蓋目前所有資料，此動作無法復原。系統會先自動下載目前資料的備份。',
    )
    await user.click(within(dialog).getByRole('button', { name: '匯入' }))
    expect(await screen.findByText('匯入完成')).toBeInTheDocument()

    // 自動備份的是匯入前的資料
    const [autoBackup] = await waitForDownloads(1)
    expect(autoBackup.fileName).toBe('my-rep-book-backup-20261024-1200.json')
    const before = JSON.parse(autoBackup.text)
    expect(before.data.workouts.map((workout: { date: string }) => workout.date)).toEqual([
      '2026-10-24',
    ])
    await waitFor(async () => expect(await lastExportedAt()).toBe('2026/10/24 12:00'))

    // 匯入的設定立即生效
    const unit = await screen.findByRole('radiogroup', { name: '重量單位' })
    await waitFor(() => expect(within(unit).getByRole('radio', { name: 'lb' })).toBeChecked())

    // 今天的訓練被取代掉，10/20 是匯入的訓練
    await goToTab(user, '今天')
    await screen.findByRole('heading', { level: 1, name: '10/24（六）' })
    await screen.findByRole('button', { name: '加入動作' })
    expect(workoutExerciseCount()).toBe(0)

    await goToTab(user, '歷史')
    const grid = await screen.findByRole('grid')
    await user.click(within(grid).getByRole('button', { name: /10月20日/ }))
    const detail = await screen.findByRole('region', { name: '10/20（二）' })
    const bench = await within(detail).findByRole('article', { name: '槓鈴臥推' })
    expect(within(bench).getByText('握距加寬')).toBeInTheDocument()
    expect(setTexts(bench)).toEqual(['熱身88.2lb×10', '132.3lb×8'])
    expect(setTexts(within(detail).getByRole('article', { name: '戶外跑步' }))).toEqual([
      '5km 30:00',
    ])
    // 匯入的體重與身高
    expect(within(detail).getByText('體重 158.7 lb')).toBeInTheDocument()
    expect(within(detail).getByText('BMI 23.5')).toBeInTheDocument()

    // 匯入的隱藏清單生效
    await goToTab(user, '動作庫')
    await screen.findByRole('link', { name: /^槓鈴臥推/ })
    expect(screen.queryByRole('link', { name: /^哈克深蹲/ })).not.toBeInTheDocument()
  })

  it('在確認對話框按取消時不下載備份，資料不變', async () => {
    const { user } = await recordTodayThenOpenSettings()

    await chooseBackupFile(user, importedBackup)
    const dialog = await screen.findByRole('alertdialog', { name: '匯入並覆蓋目前的資料？' })
    await user.click(within(dialog).getByRole('button', { name: '取消' }))
    await waitFor(() => expect(dialog).not.toBeInTheDocument())

    await goToTab(user, '今天')
    expect(await screen.findByRole('textbox', { name: '第 1 組重量（kg）' })).toHaveValue('60')
    expect(downloadCount()).toBe(0)
  })

  it('匯出後再匯入，資料與匯出前一致', async () => {
    const { user } = await renderAppWithBackup(importedBackup, '/settings')

    await user.click(await screen.findByRole('button', { name: '匯出資料' }))
    // 第 1 個是匯入前的自動備份
    const [, exported] = await waitForDownloads(2)
    expect(JSON.parse(exported.text).data).toEqual(importedBackup.data)

    await importBackup(user, exported.text)
    await user.click(screen.getByRole('button', { name: '匯出資料' }))
    const [, , autoBackup, reExported] = await waitForDownloads(4)
    expect(JSON.parse(autoBackup.text).data).toEqual(importedBackup.data)
    expect(JSON.parse(reExported.text).data).toEqual(importedBackup.data)
  })
})

describe('拒絕匯入時顯示原因，現有資料不變', () => {
  const benchOn1020 = fixtureWorkout('2026-10-20', [
    { exerciseId: 'barbell-bench-press', sets: [{ type: 'weight_reps', weightKg: 60, reps: 8 }] },
  ])

  it.each([
    { case: '不是 JSON', content: '這不是備份檔', reason: '檔案不是有效的 JSON' },
    {
      case: '版本比目前 App 新',
      content: backupFixture({}, { schemaVersion: 4 }),
      reason: '此備份來自較新版本的 App，請先更新 App',
    },
    {
      case: '格式錯誤',
      content: backupFixture({ workouts: [benchOn1020, { ...benchOn1020, date: '2026/10/21' }] }),
      reason: 'workouts[1].date 格式錯誤',
    },
    {
      case: '引用了不存在的動作',
      content: backupFixture({
        workouts: [
          fixtureWorkout('2026-10-20', [
            { exerciseId: 'custom-gone', sets: [] },
            { exerciseId: 'barbell-bench-press', sets: [] },
            { exerciseId: 'no-such-preset', sets: [] },
          ]),
        ],
      }),
      reason: '找不到以下動作：custom-gone、no-such-preset',
    },
  ])('$case', async ({ content, reason }) => {
    const { user } = await recordTodayThenOpenSettings()

    await chooseBackupFile(user, content)

    expect(await screen.findByRole('alert')).toHaveTextContent(`無法匯入：${reason}`)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(downloadCount()).toBe(0)
    await goToTab(user, '今天')
    expect(await screen.findByRole('textbox', { name: '第 1 組重量（kg）' })).toHaveValue('60')
    expect(screen.getByRole('textbox', { name: '第 1 組次數' })).toHaveValue('8')
  })
})

describe('待寫的欄位編輯', () => {
  // 輸入組的數值時，會先記進 localStorage 的待寫清單再寫入資料庫（見 WorkoutRepository.editField）。
  // 這裡直接放一筆待寫的編輯，模擬「剛輸入、還沒寫進資料庫」的時刻；
  // 透過 UI 輸入的話，寫入幾乎立刻完成，測不出匯出入有沒有處理待寫清單。
  const PENDING_KEY = 'my-rep-book:pending-field-edits'
  const benchWeight = (weightKg: number) => ({
    kind: 'setValue',
    date: '2026-10-20',
    workoutExerciseId: 'fixture-2026-10-20-1',
    setId: 'fixture-2026-10-20-1-2',
    field: 'weightKg',
    value: weightKg,
  })
  /** 等設定頁載入完（資料庫已開啟、開啟時的補寫已完成）再放入待寫的編輯 */
  async function leavePendingEdit(edit: ReturnType<typeof benchWeight>) {
    await screen.findByRole('radiogroup', { name: '重量單位' })
    localStorage.setItem(PENDING_KEY, JSON.stringify([edit]))
  }
  const kgBackup = backupFixture({
    ...importedBackup.data,
    settings: { weightUnit: 'kg', theme: 'system', heightCm: null },
  })

  it('匯出時包含剛輸入、還沒寫進資料庫的值', async () => {
    const { user } = await renderAppWithBackup(kgBackup, '/settings')

    await leavePendingEdit(benchWeight(65))
    await user.click(screen.getByRole('button', { name: '匯出資料' }))

    const [, exported] = await waitForDownloads(2)
    const [bench] = JSON.parse(exported.text).data.workouts[0].exercises
    expect(bench.sets[1].values).toEqual({ type: 'weight_reps', weightKg: 65, reps: 8 })
  })

  it('待寫清單中留有編輯時匯入：自動備份包含該編輯，重新開啟後資料與匯入檔一致、待寫清單為空', async () => {
    const { user, reload } = await renderAppWithBackup(kgBackup, '/settings')

    await leavePendingEdit(benchWeight(100))
    await importBackup(user, kgBackup)

    const [, autoBackup] = await waitForDownloads(2)
    const [benchBefore] = JSON.parse(autoBackup.text).data.workouts[0].exercises
    expect(benchBefore.sets[1].values).toEqual({ type: 'weight_reps', weightKg: 100, reps: 8 })

    window.history.pushState({}, '', `${import.meta.env.BASE_URL}day/2026-10-20`)
    reload()
    const bench = await screen.findByRole('region', { name: '槓鈴臥推' })
    expect(await within(bench).findByRole('textbox', { name: '第 2 組重量（kg）' })).toHaveValue(
      '60',
    )
    expect(localStorage.getItem(PENDING_KEY)).toBeNull()
  })
})

/** 日明細中某個動作各組的顯示文字，依順序 */
function setTexts(container: HTMLElement) {
  return within(within(container).getByRole('list', { name: '組' }))
    .getAllByRole('listitem')
    .map((item) => item.textContent)
}
