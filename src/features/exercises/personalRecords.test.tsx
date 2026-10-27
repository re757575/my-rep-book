import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { backupFixture, fixtureWorkout, type FixtureSet } from '@/test/backupFixture'
import { renderAppWithBackup } from '@/test/importBackup'

/** 槓鈴臥推某一天的組 */
function bench(date: string, sets: FixtureSet[]) {
  return fixtureWorkout(date, [{ exerciseId: 'barbell-bench-press', sets }])
}

const ws = (weightKg: number, reps: number, isWarmup = false): FixtureSet => ({
  type: 'weight_reps',
  weightKg,
  reps,
  setType: isWarmup ? 'warmup' : 'regular',
})

/**
 * 10/10：熱身 40×10、60×8、60×6（1RM 76）
 * 10/15：62.5×5（重量新紀錄；1RM 72.9）
 * 10/20：60×10、57.5×10（1RM 80，1RM 新紀錄）
 */
const backup = backupFixture({
  workouts: [
    bench('2026-10-10', [ws(40, 10, true), ws(60, 8), ws(60, 6)]),
    bench('2026-10-15', [ws(62.5, 5)]),
    bench('2026-10-20', [ws(60, 10), ws(57.5, 10)]),
  ],
})

/** 個人紀錄中某一項的 [數值, 說明] */
function recordItem(name: '最大重量' | '估算 1RM') {
  const section = screen.getByRole('region', { name: '個人紀錄' })
  const [value, detail] = within(section).getByRole('definition', { name }).children
  return [value.textContent, detail.textContent]
}

/** 歷史紀錄中各次的 [日期, 進度, 標記] */
async function sessionRows() {
  const list = await screen.findByRole('list', { name: '歷史紀錄' })
  return within(list)
    .getAllByRole('article')
    .map((entry) => [
      within(entry).getByRole('link').textContent,
      within(entry).getByText(/^最重 /).textContent,
      within(entry)
        .queryAllByText(/新紀錄$/)
        .map((badge) => badge.textContent),
    ])
}

async function chooseWeightUnit(user: UserEvent, unit: 'kg' | 'lb') {
  const tabs = screen.getByRole('navigation', { name: '主要分頁' })
  await user.click(within(tabs).getByRole('link', { name: '設定' }))
  const group = await screen.findByRole('radiogroup', { name: '重量單位' })
  const option = within(group).getByRole('radio', { name: unit })
  await user.click(option)
  await waitFor(() => expect(option).toBeChecked())
}

describe('動作詳情的個人紀錄與每次的進度', () => {
  it('顯示最大重量、估算 1RM 與第一次達到的日子', async () => {
    await renderAppWithBackup(backup, '/exercises/barbell-bench-press')
    await screen.findByRole('region', { name: '個人紀錄' })

    expect(recordItem('最大重量')).toEqual(['62.5kg×5', '2026/10/15（四）'])
    expect(recordItem('估算 1RM')).toEqual(['80 kg', '60kg×10 · 2026/10/20（二）'])
  })

  it('每一筆歷史紀錄顯示當次最重的一組、估算 1RM、訓練量，破紀錄時加上標記', async () => {
    await renderAppWithBackup(backup, '/exercises/barbell-bench-press')
    await screen.findByRole('region', { name: '個人紀錄' })

    expect(await sessionRows()).toEqual([
      ['2026/10/20（二）', '最重 60kg×10 · 估算 1RM 80 kg · 訓練量 1,175 kg', ['1RM 新紀錄']],
      ['2026/10/15（四）', '最重 62.5kg×5 · 估算 1RM 72.9 kg · 訓練量 312.5 kg', ['重量新紀錄']],
      // 第一次訓練不算新紀錄；熱身組不計入
      ['2026/10/10（六）', '最重 60kg×8 · 估算 1RM 76 kg · 訓練量 840 kg', []],
    ])
  })

  it('以目前的重量單位顯示', async () => {
    const { user } = await renderAppWithBackup(backup, '/settings')
    await chooseWeightUnit(user, 'lb')
    const tabs = screen.getByRole('navigation', { name: '主要分頁' })
    await user.click(within(tabs).getByRole('link', { name: '動作庫' }))
    await user.click(await screen.findByRole('link', { name: /^槓鈴臥推/ }))
    await screen.findByRole('region', { name: '個人紀錄' })

    expect(recordItem('最大重量')).toEqual(['137.8lb×5', '2026/10/15（四）'])
    expect(recordItem('估算 1RM')).toEqual(['176.4 lb', '132.3lb×10 · 2026/10/20（二）'])
  })

  it('沒有完整的正式組時不顯示個人紀錄，歷史紀錄照常列出', async () => {
    await renderAppWithBackup(
      backupFixture({
        workouts: [
          bench('2026-10-20', [
            ws(40, 10, true),
            { type: 'weight_reps', weightKg: 60, reps: null },
          ]),
        ],
      }),
      '/exercises/barbell-bench-press',
    )
    const list = await screen.findByRole('list', { name: '歷史紀錄' })
    expect(within(list).getAllByRole('article')).toHaveLength(1)
    expect(screen.queryByRole('region', { name: '個人紀錄' })).not.toBeInTheDocument()
    expect(within(list).queryByText(/^最重 /)).not.toBeInTheDocument()
  })

  it('不是重量×次數的動作沒有個人紀錄', async () => {
    await renderAppWithBackup(
      backupFixture({
        workouts: [
          fixtureWorkout('2026-10-20', [
            { exerciseId: 'pull-up', sets: [{ type: 'reps', reps: 8, addedWeightKg: 10 }] },
          ]),
        ],
      }),
      '/exercises/pull-up',
    )
    await screen.findByRole('list', { name: '歷史紀錄' })
    expect(screen.queryByRole('region', { name: '個人紀錄' })).not.toBeInTheDocument()
  })
})
