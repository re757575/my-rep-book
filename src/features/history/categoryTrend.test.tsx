import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { backupFixture, fixtureWorkout } from '@/test/backupFixture'
import { renderAppWithBackup } from '@/test/importBackup'
import { renderApp } from '@/test/renderApp'

// 固定的今天是 2026-10-24（週六）：本週 10/19–10/25；12 週的區間從 8/3（一）開始

const sets = (count: number) =>
  Array.from({ length: count }, () => ({ type: 'weight_reps', weightKg: 60, reps: 8 }) as const)

/**
 * 10/6（10/5 那週）臥推 4 組；10/14（10/12 那週）臥推 6 組 + 硬舉 3 組；
 * 10/21（本週）臥推 2 組；4/8（52 週區間內、12 週之外）臥推 5 組
 */
const backup = backupFixture({
  workouts: [
    fixtureWorkout('2026-04-08', [{ exerciseId: 'barbell-bench-press', sets: sets(5) }]),
    fixtureWorkout('2026-10-06', [{ exerciseId: 'barbell-bench-press', sets: sets(4) }]),
    fixtureWorkout('2026-10-14', [
      { exerciseId: 'barbell-bench-press', sets: sets(6) },
      { exerciseId: 'deadlift', sets: sets(3) },
    ]),
    fixtureWorkout('2026-10-21', [{ exerciseId: 'barbell-bench-press', sets: sets(2) }]),
  ],
})

async function trendSection() {
  return screen.findByRole('region', { name: '組數趨勢' })
}

/** 選取那一週的 [組數, 期間, …]（圖上方的 status） */
async function readout() {
  const section = await trendSection()
  return [...within(section).getByRole('status').children].map((span) => span.textContent)
}

async function chooseCategory(user: UserEvent, name: string) {
  const section = await trendSection()
  await user.click(within(section).getByRole('radio', { name }))
}

describe('各部位組數的長期趨勢（US-47）', () => {
  it('預設是「全部」與 12 週：每週一個點，最後一週是本週，圖上方顯示本週的組數與期間', async () => {
    await renderAppWithBackup(backup, '/history')
    const section = await trendSection()

    expect(within(section).getByRole('radio', { name: '全部' })).toBeChecked()
    expect(within(section).getByRole('radio', { name: '12 週' })).toBeChecked()
    await waitFor(async () =>
      expect(await readout()).toEqual(['2 組', '10/19（一） – 10/25（日）', '本週（還沒結束）']),
    )
    expect(
      within(section).getByRole('group', { name: /全部每週組數折線圖，共 12 週/ }),
    ).toBeInTheDocument()
  })

  it('文字替代的表格每一週一列，沒有訓練的週是 0 組，由舊到新', async () => {
    await renderAppWithBackup(backup, '/history')
    const section = await trendSection()

    await waitFor(() => expect(section.querySelectorAll('table.sr-only tbody tr')).toHaveLength(12))
    const rows = [...section.querySelectorAll('table.sr-only tbody tr')].map((row) => [
      row.querySelector('th')?.textContent,
      row.querySelector('td')?.textContent,
    ])
    expect(rows[0]).toEqual(['8/3（一） – 8/9（日）', '0 組'])
    expect(rows.slice(-3)).toEqual([
      ['10/5（一） – 10/11（日）', '4 組'],
      ['10/12（一） – 10/18（日）', '9 組'],
      ['10/19（一） – 10/25（日）', '2 組'],
    ])
  })

  it('平均每週不含本週：這個區間 11 週的總和是 13 組', async () => {
    await renderAppWithBackup(backup, '/history')
    const section = await trendSection()

    // (4 + 9) ÷ 11 週 = 1.2
    expect(await within(section).findByText('平均每週 1.2 組（不含本週）')).toBeInTheDocument()
  })

  it('選部位：只算那個部位的組數，一個動作的主要部位決定分類', async () => {
    const { user } = await renderAppWithBackup(backup, '/history')
    await trendSection()

    await chooseCategory(user, '胸')
    await waitFor(async () => expect((await readout())[0]).toBe('2 組'))
    const section = await trendSection()
    await waitFor(() =>
      expect(
        [...section.querySelectorAll('table.sr-only tbody td')]
          .slice(-3)
          .map((td) => td.textContent),
      ).toEqual(['4 組', '6 組', '2 組']),
    )

    await chooseCategory(user, '背')
    await waitFor(() =>
      expect(
        [...section.querySelectorAll('table.sr-only tbody td')]
          .slice(-3)
          .map((td) => td.textContent),
      ).toEqual(['0 組', '3 組', '0 組']),
    )
  })

  it('切換區間：26 週與 52 週涵蓋更早的訓練，切換後選取回到本週', async () => {
    const { user } = await renderAppWithBackup(backup, '/history')
    const section = await trendSection()

    await user.click(within(section).getByRole('radio', { name: '52 週' }))

    await waitFor(() => expect(section.querySelectorAll('table.sr-only tbody tr')).toHaveLength(52))
    // 4/8 在 4/6 那一週，只有 52 週的區間看得到
    const weeks = [...section.querySelectorAll('table.sr-only tbody tr')].map((row) => [
      row.querySelector('th')?.textContent,
      row.querySelector('td')?.textContent,
    ])
    expect(weeks).toContainEqual(['4/6（一） – 4/12（日）', '5 組'])
    expect(await readout()).toEqual(['2 組', '10/19（一） – 10/25（日）', '本週（還沒結束）'])
  })

  it('鍵盤左右鍵選取別的週，讀數跟著改變，不再標示本週', async () => {
    const { user } = await renderAppWithBackup(backup, '/history')
    const section = await trendSection()
    const chart = await within(section).findByRole('group', { name: /每週組數折線圖/ })

    chart.focus()
    await user.keyboard('{ArrowLeft}')

    await waitFor(async () =>
      expect(await readout()).toEqual(['9 組', '10/12（一） – 10/18（日）']),
    )
    await user.keyboard('{ArrowLeft}')
    await waitFor(async () => expect(await readout()).toEqual(['4 組', '10/5（一） – 10/11（日）']))
  })

  it('所選部位在這個區間一組都沒有時不畫圖，顯示說明', async () => {
    const { user } = await renderAppWithBackup(backup, '/history')
    await trendSection()

    await chooseCategory(user, '小腿')

    const section = await trendSection()
    expect(await within(section).findByText('這段期間沒有小腿的訓練')).toBeInTheDocument()
    expect(within(section).queryByRole('group', { name: /折線圖/ })).not.toBeInTheDocument()
    expect(within(section).queryByRole('status')).not.toBeInTheDocument()
  })

  it('完全沒有訓練時「全部」顯示「這段期間沒有訓練」', async () => {
    renderApp('/history')
    const section = await trendSection()

    expect(await within(section).findByText('這段期間沒有訓練')).toBeInTheDocument()
  })

  it('只算已完成的組：未完成的組（US-44）不計入', async () => {
    await renderAppWithBackup(
      backupFixture({
        workouts: [
          fixtureWorkout('2026-10-21', [
            {
              exerciseId: 'barbell-bench-press',
              sets: [
                { type: 'weight_reps', weightKg: 60, reps: 8, done: true },
                { type: 'weight_reps', weightKg: 60, reps: 8, done: false },
                { type: 'weight_reps', weightKg: 60, reps: 8, done: false },
              ],
            },
          ]),
        ],
      }),
      '/history',
    )
    await trendSection()

    await waitFor(async () => expect((await readout())[0]).toBe('1 組'))
  })
})
