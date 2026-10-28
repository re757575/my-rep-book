import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import {
  backupFixture,
  fixtureCustomExercise,
  fixtureTemplate,
  fixtureWorkout,
} from '@/test/backupFixture'
import { downloadCount, waitForDownloads } from '@/test/downloads'
import { importBackup, renderAppWithBackup } from '@/test/importBackup'
import { renderApp } from '@/test/renderApp'
import { unlockDay } from '@/test/unlockDay'

const benchDay = fixtureWorkout('2026-10-20', [
  {
    exerciseId: 'barbell-bench-press',
    sets: [
      { type: 'weight_reps', weightKg: 40, reps: 10, setType: 'warmup' },
      { type: 'weight_reps', weightKg: 60, reps: 8 },
      { type: 'weight_reps', weightKg: 60, reps: 8 },
    ],
  },
  { exerciseId: 'plank', sets: [{ type: 'duration', durationSec: 90 }] },
])

/** 今天（10/24）已經做了硬舉：熱身 + 兩個正式組，另有平板支撐 */
const deadliftToday = fixtureWorkout('2026-10-24', [
  {
    exerciseId: 'deadlift',
    sets: [
      { type: 'weight_reps', weightKg: 60, reps: 5, setType: 'warmup' },
      { type: 'weight_reps', weightKg: 100, reps: 5 },
      { type: 'weight_reps', weightKg: 100, reps: 5 },
    ],
  },
  { exerciseId: 'plank', sets: [{ type: 'duration', durationSec: 60 }] },
])

/** 建立時間不同，列表依建立時間由舊到新：推日在前、三合一在後 */
const push = fixtureTemplate(
  'push',
  '推日',
  [
    ['barbell-bench-press', 3],
    ['plank', 1],
  ],
  '2026-10-02T00:00:00.000Z',
)
const pushPullLegs = fixtureTemplate(
  'multi',
  '三合一',
  [
    ['barbell-bench-press', 3],
    ['plank', 2],
    ['deadlift', 4],
  ],
  '2026-10-03T00:00:00.000Z',
)

/** 點底部的分頁 */
async function goToTab(user: UserEvent, tab: '今天' | '歷史' | '動作庫' | '設定') {
  const tabs = screen.getByRole('navigation', { name: '主要分頁' })
  await user.click(within(tabs).getByRole('link', { name: tab }))
}

/** 從設定頁前往範本列表 */
async function openTemplateList(user: UserEvent) {
  await goToTab(user, '設定')
  await user.click(await screen.findByRole('link', { name: '管理範本' }))
  expect(await screen.findByRole('heading', { level: 1, name: '訓練範本' })).toBeInTheDocument()
}

/** 從範本列表點進某個範本，回傳「範本的動作」清單 */
async function openTemplate(user: UserEvent, name: string | RegExp) {
  const list = await screen.findByRole('list', { name: '範本' })
  await user.click(await within(list).findByRole('link', { name }))
  await screen.findByRole('textbox', { name: '範本名稱' })
  return screen.findByRole('list', { name: '範本的動作' })
}

/** 範本詳情頁上各動作的名稱，依畫面順序 */
function rowNames(list: HTMLElement) {
  return within(list)
    .getAllByRole('listitem')
    .map((item) => item.firstElementChild?.textContent)
}

/** 訓練頁上各訓練動作的名稱，依畫面順序 */
function exerciseOrder() {
  return screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)
}

/** 在歷史的月曆選某一天，回傳那天的日明細 */
async function openDayDetail(user: UserEvent, dayLabel: string, title: string) {
  await user.click(await screen.findByRole('button', { name: new RegExp(dayLabel) }))
  return screen.findByRole('region', { name: title })
}

/** 點「存成範本」，在對話框輸入名稱並儲存 */
async function saveAsTemplate(
  user: UserEvent,
  scope: HTMLElement | undefined,
  name: string,
  typed = name,
) {
  const root = scope ? within(scope) : screen
  await user.click(await root.findByRole('button', { name: '存成範本' }))
  const dialog = await screen.findByRole('dialog', { name: '存成範本' })
  await user.type(within(dialog).getByRole('textbox', { name: '範本名稱' }), typed)
  await user.click(within(dialog).getByRole('button', { name: '儲存' }))
  expect(await screen.findByText(`已存成範本『${name}』`)).toBeInTheDocument()
}

describe('存成範本（US-40）', () => {
  it('訓練頁：輸入名稱後存成範本，組數是正式組數（不含熱身組）', async () => {
    const { user } = await renderAppWithBackup(backupFixture({ workouts: [deadliftToday] }), '/')
    await saveAsTemplate(user, undefined, '拉日', '  拉日 ')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await openTemplateList(user)
    const list = await screen.findByRole('list', { name: '範本' })
    // 硬舉 2 個正式組（熱身不算）+ 平板支撐 1 組；名稱去掉了前後空白
    expect(await within(list).findByRole('link', { name: /^拉日/ })).toHaveTextContent(
      '2 個動作 · 3 組',
    )
  })

  it('歷史的日明細也可以存成範本', async () => {
    const { user } = await renderAppWithBackup(backupFixture({ workouts: [benchDay] }), '/history')
    const detail = await openDayDetail(user, '10月20日', '10/20（二）')

    await saveAsTemplate(user, detail, '推日')

    await openTemplateList(user)
    const list = await screen.findByRole('list', { name: '範本' })
    expect(await within(list).findByRole('link', { name: /^推日/ })).toHaveTextContent(
      '2 個動作 · 3 組',
    )
  })

  it('訓練頁鎖定時照樣可以存成範本', async () => {
    const { user } = await renderAppWithBackup(
      backupFixture({ workouts: [benchDay] }),
      '/day/2026-10-20',
    )
    expect(await screen.findByRole('button', { name: '鎖定' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await saveAsTemplate(user, undefined, '推日')
  })

  it('名稱空白時顯示錯誤、不儲存；超過 30 個字也不能儲存', async () => {
    const { user } = await renderAppWithBackup(backupFixture({ workouts: [benchDay] }), '/history')
    const detail = await openDayDetail(user, '10月20日', '10/20（二）')
    await user.click(await within(detail).findByRole('button', { name: '存成範本' }))
    const dialog = await screen.findByRole('dialog', { name: '存成範本' })
    const name = within(dialog).getByRole('textbox', { name: '範本名稱' })

    await user.click(within(dialog).getByRole('button', { name: '儲存' }))
    expect(await within(dialog).findByText('請輸入範本名稱')).toBeInTheDocument()
    expect(name).toHaveAccessibleDescription('請輸入範本名稱')

    await user.click(name)
    await user.paste('推'.repeat(31))
    await user.click(within(dialog).getByRole('button', { name: '儲存' }))
    expect(await within(dialog).findByText('名稱最多 30 個字')).toBeInTheDocument()
    expect(screen.queryByText(/已存成範本/)).not.toBeInTheDocument()

    // 改成 30 個字後可以儲存
    await user.clear(name)
    await user.paste('推'.repeat(30))
    await user.click(within(dialog).getByRole('button', { name: '儲存' }))
    expect(await screen.findByText(`已存成範本『${'推'.repeat(30)}』`)).toBeInTheDocument()
  })

  it('取消不建立範本；同名的範本可以並存', async () => {
    const { user } = await renderAppWithBackup(
      backupFixture({ workouts: [benchDay], templates: [push] }),
      '/history',
    )
    const detail = await openDayDetail(user, '10月20日', '10/20（二）')
    await user.click(await within(detail).findByRole('button', { name: '存成範本' }))
    const dialog = await screen.findByRole('dialog', { name: '存成範本' })
    await user.type(within(dialog).getByRole('textbox', { name: '範本名稱' }), '不要存')
    await user.click(within(dialog).getByRole('button', { name: '取消' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    await saveAsTemplate(user, detail, '推日')

    await openTemplateList(user)
    const list = await screen.findByRole('list', { name: '範本' })
    await waitFor(() =>
      expect(within(list).getAllByRole('link', { name: /^推日/ })).toHaveLength(2),
    )
    expect(within(list).queryByRole('link', { name: /不要存/ })).not.toBeInTheDocument()
  })

  it('這天沒有訓練時沒有「存成範本」', async () => {
    renderApp()
    await screen.findByRole('button', { name: '加入動作' })
    expect(screen.queryByRole('button', { name: '存成範本' })).not.toBeInTheDocument()
  })
})

describe('從範本加入動作（US-41）', () => {
  const backup = backupFixture({ workouts: [benchDay, deadliftToday], templates: [push] })

  /** 打開「從範本加入」選單，點某個範本 */
  async function pickTemplate(user: UserEvent, name: RegExp) {
    await user.click(await screen.findByRole('button', { name: '從範本加入' }))
    const dialog = await screen.findByRole('dialog', { name: '從範本加入' })
    const list = await within(dialog).findByRole('list', { name: '範本' })
    await user.click(within(list).getByRole('button', { name }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  }

  it('選單列出名稱、動作數與組數、動作名稱', async () => {
    const { user } = await renderAppWithBackup(backup)
    await user.click(await screen.findByRole('button', { name: '從範本加入' }))
    const dialog = await screen.findByRole('dialog', { name: '從範本加入' })
    const item = await within(dialog).findByRole('button', { name: /^推日/ })
    expect(item).toHaveTextContent('推日')
    expect(item).toHaveTextContent('2 個動作 · 4 組')
    expect(item).toHaveTextContent('槓鈴臥推、平板支撐')
  })

  it('加到今天訓練的最後面：每個動作建立範本的組數，第一組依上次紀錄預填，其餘複製前一組', async () => {
    const { user } = await renderAppWithBackup(backup)
    await pickTemplate(user, /^推日/)

    expect(await screen.findByText('已加入『推日』的 2 個動作')).toBeInTheDocument()
    await waitFor(() =>
      expect(exerciseOrder()).toEqual(['硬舉', '平板支撐', '槓鈴臥推', '平板支撐']),
    )

    const bench = screen.getByRole('region', { name: '槓鈴臥推' })
    expect(within(bench).getAllByRole('textbox', { name: /^第 \d+ 組/ })).toHaveLength(6)
    for (const n of [1, 2, 3]) {
      expect(within(bench).getByRole('textbox', { name: `第 ${n} 組重量（kg）` })).toHaveValue('60')
      expect(within(bench).getByRole('textbox', { name: `第 ${n} 組次數` })).toHaveValue('8')
      expect(
        within(bench).getByRole('button', { name: `第 ${n} 組類型：正式` }),
      ).toBeInTheDocument()
    }
    // 今天原本的硬舉不受影響：熱身 + 兩個正式組
    const deadlift = screen.getByRole('region', { name: '硬舉' })
    expect(within(deadlift).getAllByRole('textbox', { name: /^第 \d+ 組/ })).toHaveLength(6)
  })

  it('今天還沒有訓練時建立；沒有上次紀錄的動作欄位空白', async () => {
    const { user } = await renderAppWithBackup(
      backupFixture({ templates: [fixtureTemplate('legs', '腿日', [['barbell-squat', 2]])] }),
    )
    await pickTemplate(user, /^腿日/)

    const squat = await screen.findByRole('region', { name: '槓鈴深蹲' })
    expect(within(squat).getByRole('textbox', { name: '第 1 組重量（kg）' })).toHaveValue('')
    expect(within(squat).getAllByRole('textbox', { name: /^第 \d+ 組/ })).toHaveLength(4)
  })

  it('復原：移除這次加進來的動作；今天原本沒有訓練時訓練一併移除', async () => {
    const { user } = await renderAppWithBackup(backup)
    await pickTemplate(user, /^推日/)
    await waitFor(() => expect(exerciseOrder()).toHaveLength(4))

    await user.click(await screen.findByRole('button', { name: '復原' }))

    await waitFor(() => expect(exerciseOrder()).toEqual(['硬舉', '平板支撐']))
  })

  it('復原後今天沒有訓練了，月曆不再標點', async () => {
    const { user } = await renderAppWithBackup(backupFixture({ templates: [push] }), '/')
    await pickTemplate(user, /^推日/)
    await waitFor(() => expect(exerciseOrder()).toEqual(['槓鈴臥推', '平板支撐']))

    const undo = await screen.findByRole('button', { name: '復原' })
    await user.click(undo)
    await waitFor(() => expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0))

    await goToTab(user, '歷史')
    const today = await screen.findByRole('button', { name: /10月24日/ })
    expect(today).not.toHaveAccessibleName(/有訓練/)
  })

  it('同一個範本可以加兩次，同名的動作不合併', async () => {
    const { user } = await renderAppWithBackup(
      backupFixture({ templates: [fixtureTemplate('a', '只有平板', [['plank', 1]])] }),
    )
    await pickTemplate(user, /^只有平板/)
    await waitFor(() => expect(exerciseOrder()).toEqual(['平板支撐']))
    await pickTemplate(user, /^只有平板/)
    await waitFor(() => expect(exerciseOrder()).toEqual(['平板支撐', '平板支撐']))
  })

  it('補記過去的日期：加到那天，上次紀錄取那天之前', async () => {
    const { user } = await renderAppWithBackup(
      backupFixture({
        workouts: [
          fixtureWorkout('2026-10-18', [
            {
              exerciseId: 'barbell-bench-press',
              sets: [{ type: 'weight_reps', weightKg: 50, reps: 10 }],
            },
          ]),
          benchDay,
        ],
        templates: [fixtureTemplate('b', '只有臥推', [['barbell-bench-press', 2]])],
      }),
      '/day/2026-10-19',
    )
    await unlockDay(user)
    await pickTemplate(user, /^只有臥推/)

    const bench = await screen.findByRole('region', { name: '槓鈴臥推' })
    // 10/19 之前最近一次是 10/18 的 50×10，不是 10/20 的 60×8
    expect(within(bench).getByRole('textbox', { name: '第 1 組重量（kg）' })).toHaveValue('50')
    expect(within(bench).getByRole('textbox', { name: '第 2 組次數' })).toHaveValue('10')
    expect(window.location.pathname).toBe(`${import.meta.env.BASE_URL}day/2026-10-19`)
  })

  it('訓練頁鎖定時沒有「從範本加入」，解鎖後才有', async () => {
    const { user } = await renderAppWithBackup(backup, '/day/2026-10-20')
    await screen.findByRole('button', { name: '存成範本' })
    expect(screen.queryByRole('button', { name: '從範本加入' })).not.toBeInTheDocument()

    await unlockDay(user)

    expect(await screen.findByRole('button', { name: '從範本加入' })).toBeInTheDocument()
  })

  it('還沒有範本時顯示說明與「管理範本」連結', async () => {
    const { user } = renderApp()
    await user.click(await screen.findByRole('button', { name: '從範本加入' }))
    const dialog = await screen.findByRole('dialog', { name: '從範本加入' })

    expect(await within(dialog).findByText('還沒有範本')).toBeInTheDocument()
    expect(within(dialog).getByText(/點「存成範本」建立/)).toBeInTheDocument()

    await user.click(within(dialog).getByRole('link', { name: '管理範本' }))
    expect(await screen.findByRole('heading', { level: 1, name: '訓練範本' })).toBeInTheDocument()
    expect(window.location.pathname).toBe(`${import.meta.env.BASE_URL}templates`)
  })
})

describe('管理範本（US-42）', () => {
  it('設定頁顯示範本數量，前往範本列表；列表顯示名稱與摘要', async () => {
    const { user } = await renderAppWithBackup(
      backupFixture({ templates: [push, pushPullLegs] }),
      '/settings',
    )
    expect(await screen.findByText('共 2 個範本')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: '管理範本' }))

    const list = await screen.findByRole('list', { name: '範本' })
    const links = await within(list).findAllByRole('link')
    expect(links.map((link) => link.textContent)).toEqual([
      '推日2 個動作 · 4 組',
      '三合一3 個動作 · 9 組',
    ])
  })

  it('列表沒有範本時顯示說明', async () => {
    const { user } = renderApp('/settings')
    expect(await screen.findByText('共 0 個範本')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: '管理範本' }))
    expect(await screen.findByText('還沒有範本')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: '範本' })).not.toBeInTheDocument()
  })

  it('改名：輸入即儲存，重新整理後仍在', async () => {
    const { user, reload } = await renderAppWithBackup(
      backupFixture({ templates: [push] }),
      '/templates',
    )
    await openTemplate(user, /^推日/)
    const name = screen.getByRole('textbox', { name: '範本名稱' })

    await user.clear(name)
    await user.type(name, '  胸日')
    await waitFor(() => expect(name).toHaveValue('  胸日'))

    reload()

    expect(await screen.findByRole('textbox', { name: '範本名稱' })).toHaveValue('胸日')
  })

  it('名稱不合法時顯示錯誤、不寫入，重新整理後保留最後一個合法的名稱', async () => {
    const { user, reload } = await renderAppWithBackup(
      backupFixture({ templates: [push] }),
      '/templates',
    )
    await openTemplate(user, /^推日/)
    const name = screen.getByRole('textbox', { name: '範本名稱' })

    await user.clear(name)
    expect(await screen.findByText('請輸入範本名稱')).toBeInTheDocument()
    await user.click(name)
    await user.paste('推'.repeat(31))
    expect(await screen.findByText('名稱最多 30 個字')).toBeInTheDocument()

    reload()

    expect(await screen.findByRole('textbox', { name: '範本名稱' })).toHaveValue('推日')
  })

  it('組數的「−」「＋」：連續點擊不會互相覆蓋，到 1 或 20 時停用', async () => {
    const { user, reload } = await renderAppWithBackup(
      backupFixture({
        templates: [
          fixtureTemplate('limits', '邊界', [
            ['barbell-bench-press', 3],
            ['plank', 1],
            ['deadlift', 20],
          ]),
        ],
      }),
      '/templates',
    )
    const list = await openTemplate(user, /^邊界/)
    const [bench, plank, deadlift] = within(list).getAllByRole('listitem')

    await user.click(within(bench).getByRole('button', { name: '增加組數' }))
    await user.click(within(bench).getByRole('button', { name: '增加組數' }))
    await user.click(within(bench).getByRole('button', { name: '增加組數' }))
    await waitFor(() => expect(within(bench).getByText('6 組')).toBeInTheDocument())
    await user.click(within(bench).getByRole('button', { name: '減少組數' }))
    await waitFor(() => expect(within(bench).getByText('5 組')).toBeInTheDocument())

    expect(within(plank).getByRole('button', { name: '減少組數' })).toBeDisabled()
    expect(within(plank).getByRole('button', { name: '增加組數' })).toBeEnabled()
    expect(within(deadlift).getByRole('button', { name: '增加組數' })).toBeDisabled()
    expect(within(deadlift).getByRole('button', { name: '減少組數' })).toBeEnabled()
    expect(screen.getByText('3 個動作 · 26 組')).toBeInTheDocument()

    reload()

    const reloaded = await screen.findByRole('list', { name: '範本的動作' })
    expect(within(reloaded).getByText('5 組')).toBeInTheDocument()
  })

  it('上移、下移：和相鄰的動作交換，第一個不能上移、最後一個不能下移', async () => {
    const { user } = await renderAppWithBackup(
      backupFixture({ templates: [pushPullLegs] }),
      '/templates',
    )
    const list = await openTemplate(user, /^三合一/)
    expect(rowNames(list)).toEqual(['槓鈴臥推', '平板支撐', '硬舉'])
    const rows = () => within(list).getAllByRole('listitem')
    expect(within(rows()[0]).getByRole('button', { name: '上移' })).toBeDisabled()
    expect(within(rows()[2]).getByRole('button', { name: '下移' })).toBeDisabled()

    await user.click(within(rows()[1]).getByRole('button', { name: '上移' }))
    await waitFor(() => expect(rowNames(list)).toEqual(['平板支撐', '槓鈴臥推', '硬舉']))
    await user.click(within(rows()[1]).getByRole('button', { name: '下移' }))
    await waitFor(() => expect(rowNames(list)).toEqual(['平板支撐', '硬舉', '槓鈴臥推']))
    // 組數跟著動作走
    expect(within(rows()[1]).getByText('4 組')).toBeInTheDocument()
  })

  it('移除動作：只剩一個動作時不能再移除', async () => {
    const { user } = await renderAppWithBackup(backupFixture({ templates: [push] }), '/templates')
    const list = await openTemplate(user, /^推日/)

    await user.click(
      within(within(list).getAllByRole('listitem')[0]).getByRole('button', { name: '移除動作' }),
    )

    await waitFor(() => expect(rowNames(list)).toEqual(['平板支撐']))
    expect(
      within(within(list).getAllByRole('listitem')[0]).getByRole('button', { name: '移除動作' }),
    ).toBeDisabled()
  })

  it('加入動作：用和訓練頁相同的選單，加到最後面，預設 3 組', async () => {
    const { user, reload } = await renderAppWithBackup(
      backupFixture({ templates: [push] }),
      '/templates',
    )
    const list = await openTemplate(user, /^推日/)

    await user.click(screen.getByRole('button', { name: '加入動作' }))
    const dialog = await screen.findByRole('dialog', { name: '加入動作' })
    const exercises = await within(dialog).findByRole('list', { name: '動作清單' })
    await user.click(within(exercises).getByRole('button', { name: /^硬舉/ }))

    await waitFor(() => expect(rowNames(list)).toEqual(['槓鈴臥推', '平板支撐', '硬舉']))
    expect(within(within(list).getAllByRole('listitem')[2]).getByText('3 組')).toBeInTheDocument()

    reload()
    const reloaded = await screen.findByRole('list', { name: '範本的動作' })
    expect(rowNames(reloaded)).toEqual(['槓鈴臥推', '平板支撐', '硬舉'])
  })

  it('刪除範本：直接刪除回到列表，toast 可以復原', async () => {
    const { user } = await renderAppWithBackup(
      backupFixture({ templates: [push, pushPullLegs] }),
      '/templates',
    )
    await openTemplate(user, /^推日/)

    await user.click(screen.getByRole('button', { name: '刪除範本' }))

    expect(await screen.findByText('已刪除範本『推日』')).toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    const list = await screen.findByRole('list', { name: '範本' })
    await waitFor(() => expect(within(list).getAllByRole('link')).toHaveLength(1))
    expect(within(list).queryByRole('link', { name: /^推日/ })).not.toBeInTheDocument()

    await user.click(await screen.findByRole('button', { name: '復原' }))

    // 放回原本的位置：建立時間較早，排在前面
    await waitFor(() =>
      expect(
        within(list)
          .getAllByRole('link')
          .map((link) => link.textContent),
      ).toEqual(['推日2 個動作 · 4 組', '三合一3 個動作 · 9 組']),
    )
  })

  it('範本頁面屬於「設定」分頁，底部的設定分頁呈現選取狀態', async () => {
    renderApp('/templates')
    await screen.findByRole('heading', { level: 1, name: '訓練範本' })
    const tabs = screen.getByRole('navigation', { name: '主要分頁' })
    expect(within(tabs).getByRole('link', { name: '設定' })).toHaveAttribute('aria-current', 'page')
  })

  it('找不到範本時顯示說明與回列表的連結', async () => {
    renderApp('/templates/not-exist')
    expect(await screen.findByText('找不到這個範本')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '範本' })).toHaveAttribute(
      'href',
      `${import.meta.env.BASE_URL}templates`,
    )
  })

  describe('刪除沒有紀錄的自訂動作（US-12）', () => {
    const curl = fixtureCustomExercise({
      id: 'custom-curl',
      nameZh: '自訂彎舉',
      trackingType: 'weight_reps',
    })

    it('範本裡的這個動作一併移除；範本因此沒有動作時整個刪除', async () => {
      const { user } = await renderAppWithBackup(
        backupFixture({
          customExercises: [curl],
          templates: [
            fixtureTemplate('mixed', '混合', [
              ['barbell-bench-press', 3],
              ['custom-curl', 2],
              ['custom-curl', 1],
            ]),
            fixtureTemplate('only-curl', '只有彎舉', [['custom-curl', 4]]),
          ],
        }),
        '/exercises/custom-curl',
      )
      await user.click(await screen.findByRole('button', { name: '刪除' }))
      const confirm = await screen.findByRole('alertdialog', { name: '刪除「自訂彎舉」？' })
      await user.click(within(confirm).getByRole('button', { name: '刪除' }))
      expect(await screen.findByRole('heading', { name: '動作庫' })).toBeInTheDocument()

      await openTemplateList(user)
      const list = await screen.findByRole('list', { name: '範本' })
      await waitFor(() => expect(within(list).getAllByRole('link')).toHaveLength(1))
      const exercises = await openTemplate(user, /^混合/)
      expect(rowNames(exercises)).toEqual(['槓鈴臥推'])
    })
  })
})

describe('備份', () => {
  it('匯出的備份檔包含範本，匯入後還原', async () => {
    const { user } = await renderAppWithBackup(
      backupFixture({ templates: [push, pushPullLegs] }),
      '/settings',
    )
    // 匯入前會先自動下載舊資料的備份，所以取這次點擊之後下載的那一份
    const before = downloadCount()
    await user.click(await screen.findByRole('button', { name: '匯出資料' }))
    const file = (await waitForDownloads(before + 1)).at(-1)!

    const exported = JSON.parse(file.text) as {
      schemaVersion: number
      data: { templates: unknown }
    }
    expect(exported.schemaVersion).toBe(5)
    expect(exported.data.templates).toEqual([push, pushPullLegs])
  })

  it('匯入的備份整份取代現有的範本', async () => {
    const { user } = await renderAppWithBackup(backupFixture({ templates: [push] }), '/settings')
    expect(await screen.findByText('共 1 個範本')).toBeInTheDocument()

    await importBackup(user, backupFixture({ templates: [pushPullLegs] }))

    expect(await screen.findByText('共 1 個範本')).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: '管理範本' }))
    const list = await screen.findByRole('list', { name: '範本' })
    expect(within(list).getByRole('link', { name: /^三合一/ })).toBeInTheDocument()
    expect(within(list).queryByRole('link', { name: /^推日/ })).not.toBeInTheDocument()
  })
})
