import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { backupFixture, fixtureWorkout, type FixtureSet } from '@/test/backupFixture'
import { renderAppWithBackup } from '@/test/importBackup'

const ws = (weightKg: number, reps: number, isWarmup = false): FixtureSet => ({
  type: 'weight_reps',
  weightKg,
  reps,
  setType: isWarmup ? 'warmup' : 'regular',
})

function bench(date: string, sets: FixtureSet[]) {
  return fixtureWorkout(date, [{ exerciseId: 'barbell-bench-press', sets }])
}

/**
 * 10/10：60×8、60×6（最重 60，1RM 76，訓練量 840）
 * 10/15：62.5×5（最重 62.5，1RM 72.9，訓練量 312.5）
 * 10/20：60×10、57.5×10（最重 60，1RM 80，訓練量 1,175）
 */
const backup = backupFixture({
  workouts: [
    bench('2026-10-10', [ws(40, 10, true), ws(60, 8), ws(60, 6)]),
    bench('2026-10-15', [ws(62.5, 5)]),
    bench('2026-10-20', [ws(60, 10), ws(57.5, 10)]),
  ],
})

/** 進度區塊 */
function progress() {
  return screen.findByRole('region', { name: '進度' })
}

/** 圖上方選取那一次的 [數值, 日期] */
function readout(section: HTMLElement) {
  const [value, date] = within(section).getByRole('status').children
  return [value.textContent, date.textContent]
}

describe('動作詳情的進度圖表', () => {
  it('預設最大重量，顯示最新一次的數值與日期；切換指標改看估算 1RM 與訓練量', async () => {
    const { user } = await renderAppWithBackup(backup, '/exercises/barbell-bench-press')
    const section = await progress()

    expect(within(section).getByRole('radio', { name: '最大重量' })).toBeChecked()
    expect(readout(section)).toEqual(['60 kg', '2026/10/20（二）'])

    await user.click(within(section).getByRole('radio', { name: '估算 1RM' }))
    expect(readout(section)).toEqual(['80 kg', '2026/10/20（二）'])

    await user.click(within(section).getByRole('radio', { name: '訓練量' }))
    expect(readout(section)).toEqual(['1,175 kg', '2026/10/20（二）'])
  })

  it('用左右鍵選擇其他次，Home／End 跳到最早與最新；切換指標時選的是同一次', async () => {
    const { user } = await renderAppWithBackup(backup, '/exercises/barbell-bench-press')
    const section = await progress()
    const chart = within(section).getByRole('group', { name: /折線圖，共 3 次訓練/ })

    chart.focus()
    await user.keyboard('{ArrowLeft}')
    expect(readout(section)).toEqual(['62.5 kg', '2026/10/15（四）'])
    await user.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(readout(section)).toEqual(['60 kg', '2026/10/10（六）'])
    await user.keyboard('{End}')
    expect(readout(section)).toEqual(['60 kg', '2026/10/20（二）'])
    await user.keyboard('{Home}')
    await user.click(within(section).getByRole('radio', { name: '估算 1RM' }))
    expect(readout(section)).toEqual(['76 kg', '2026/10/10（六）'])
  })

  it('給螢幕閱讀器的表格，每一次訓練一列、由舊到新', async () => {
    await renderAppWithBackup(backup, '/exercises/barbell-bench-press')
    const section = await progress()

    const table = within(section).getByRole('table', { name: '最大重量（kg）' })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows.map((row) => row.textContent)).toEqual([
      '2026/10/10（六）60 kg',
      '2026/10/15（四）62.5 kg',
      '2026/10/20（二）60 kg',
    ])
  })

  it('以目前的重量單位顯示', async () => {
    await renderAppWithBackup(
      backupFixture({
        workouts: backup.data.workouts,
        settings: { weightUnit: 'lb' },
      }),
      '/exercises/barbell-bench-press',
    )
    const section = await progress()

    // 60 kg = 132.3 lb
    await waitFor(() => expect(readout(section)).toEqual(['132.3 lb', '2026/10/20（二）']))
    expect(within(section).getByRole('group', { name: /（lb）折線圖/ })).toBeInTheDocument()
  })

  it('只有 1 次訓練時不顯示圖表（個人紀錄與歷史紀錄照常）', async () => {
    await renderAppWithBackup(
      backupFixture({ workouts: [bench('2026-10-20', [ws(60, 8)])] }),
      '/exercises/barbell-bench-press',
    )

    // 個人紀錄載入後才斷言沒有進度，否則還沒載入就通過了
    await screen.findByRole('region', { name: '個人紀錄' })
    expect(screen.queryByRole('region', { name: '進度' })).not.toBeInTheDocument()
  })

  it('不是重量×次數的動作沒有進度圖表', async () => {
    await renderAppWithBackup(
      backupFixture({
        workouts: [
          fixtureWorkout('2026-10-19', [
            { exerciseId: 'plank', sets: [{ type: 'duration', durationSec: 60 }] },
          ]),
          fixtureWorkout('2026-10-20', [
            { exerciseId: 'plank', sets: [{ type: 'duration', durationSec: 90 }] },
          ]),
        ],
      }),
      '/exercises/plank',
    )

    await screen.findByRole('list', { name: '歷史紀錄' })
    expect(screen.queryByRole('region', { name: '進度' })).not.toBeInTheDocument()
  })
})
