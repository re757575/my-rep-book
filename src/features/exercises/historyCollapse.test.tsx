import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { addDays } from '@/domain'
import { backupFixture, fixtureWorkout } from '@/test/backupFixture'
import { renderAppWithBackup } from '@/test/importBackup'

/** 今天（2026-10-24）之前每隔一天做一次，由近到遠 `count` 筆；`make` 決定每天的組 */
function everyOtherDay(count: number, make: (n: number) => Parameters<typeof fixtureWorkout>[1]) {
  return Array.from({ length: count }, (_, n) =>
    fixtureWorkout(addDays('2026-10-23', -2 * n), make(n)),
  )
}

/** 臥推：第 n 次（0 是最近）最重 60 + n kg × 8 */
const benchBackup = backupFixture({
  workouts: everyOtherDay(5, (n) => [
    {
      exerciseId: 'barbell-bench-press',
      note: `第 ${n} 筆備註`,
      sets: [{ type: 'weight_reps', weightKg: 60 - n, reps: 8 }],
    },
  ]),
})

async function historyEntries() {
  const list = await screen.findByRole('list', { name: '歷史紀錄' })
  return within(list).getAllByRole('article')
}

/** 某一筆的展開／收合按鈕 */
function toggleOf(entry: HTMLElement) {
  return within(entry).getByRole('button', { name: /的各組與備註$/ })
}

describe('動作歷史可收合', () => {
  it('預設最近 3 筆展開，更早的收合；收合時隱藏各組與備註，仍有日期與當次的進度', async () => {
    await renderAppWithBackup(benchBackup, '/exercises/barbell-bench-press')
    const entries = await historyEntries()

    expect(entries.map((entry) => toggleOf(entry).getAttribute('aria-expanded'))).toEqual([
      'true',
      'true',
      'true',
      'false',
      'false',
    ])
    // 展開的有各組與備註
    expect(within(entries[0]).getByRole('list', { name: '組' })).toBeInTheDocument()
    expect(within(entries[0]).getByText('第 0 筆備註')).toBeInTheDocument()
    // 收合的隱藏各組與備註（只是 hidden，還在 DOM 裡），日期連結與當次進度還在
    expect(within(entries[3]).queryByRole('list', { name: '組' })).not.toBeInTheDocument()
    expect(within(entries[3]).getByText('第 3 筆備註')).not.toBeVisible()
    expect(within(entries[3]).getByRole('link', { name: '2026/10/17（六）' })).toBeInTheDocument()
    expect(within(entries[3]).getByText(/^最重 57kg×8 · 估算 1RM /)).toBeInTheDocument()
  })

  it('按按鈕展開、再按收合；點日期仍然前往該日的訓練頁', async () => {
    const { user } = await renderAppWithBackup(benchBackup, '/exercises/barbell-bench-press')
    const [first, , , fourth] = await historyEntries()

    await user.click(toggleOf(fourth))
    expect(toggleOf(fourth)).toHaveAttribute('aria-expanded', 'true')
    expect(within(fourth).getByRole('list', { name: '組' })).toBeInTheDocument()
    expect(within(fourth).getByText('第 3 筆備註')).toBeInTheDocument()

    await user.click(toggleOf(first))
    expect(toggleOf(first)).toHaveAttribute('aria-expanded', 'false')
    expect(within(first).queryByRole('list', { name: '組' })).not.toBeInTheDocument()

    await user.click(within(first).getByRole('link', { name: '2026/10/23（五）' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: '10/23（五）' }),
    ).toBeInTheDocument()
  })

  it('不記住：重新整理後回到預設（最近 3 筆展開）', async () => {
    const { user, reload } = await renderAppWithBackup(
      benchBackup,
      '/exercises/barbell-bench-press',
    )
    const [first, , , fourth] = await historyEntries()
    await user.click(toggleOf(first))
    await user.click(toggleOf(fourth))

    reload()

    await waitFor(async () => {
      const entries = await historyEntries()
      expect(entries.map((entry) => toggleOf(entry).getAttribute('aria-expanded'))).toEqual([
        'true',
        'true',
        'true',
        'false',
        'false',
      ])
    })
  })

  it('其他記錄類型收合時顯示這一次的總計', async () => {
    await renderAppWithBackup(
      backupFixture({
        workouts: everyOtherDay(4, (n) => [
          {
            exerciseId: 'plank',
            sets: [
              { type: 'duration', durationSec: 60 + 30 * n },
              { type: 'duration', durationSec: 60 },
            ],
          },
        ]),
      }),
      '/exercises/plank',
    )
    const entries = await historyEntries()

    // 第 4 筆（n = 3）收合：兩組是 60 + 30 × 3 = 150 秒與 60 秒，共 03:30
    expect(toggleOf(entries[3])).toHaveAttribute('aria-expanded', 'false')
    expect(within(entries[3]).getByText('2 組 · 共 03:30')).toBeInTheDocument()
    expect(within(entries[3]).queryByRole('list', { name: '組' })).not.toBeInTheDocument()
    // 展開的不顯示總計，改列各組
    expect(within(entries[0]).queryByText(/^2 組 · /)).not.toBeInTheDocument()
    expect(within(entries[0]).getByRole('list', { name: '組' })).toBeInTheDocument()
  })

  it('按「載入更多」載入的更早紀錄也是收合的', async () => {
    const { user } = await renderAppWithBackup(
      backupFixture({
        workouts: everyOtherDay(23, () => [
          {
            exerciseId: 'barbell-bench-press',
            sets: [{ type: 'weight_reps', weightKg: 60, reps: 8 }],
          },
        ]),
      }),
      '/exercises/barbell-bench-press',
    )
    await historyEntries()
    await user.click(await screen.findByRole('button', { name: '載入更多' }))

    await waitFor(async () => expect(await historyEntries()).toHaveLength(23))
    const entries = await historyEntries()
    expect(toggleOf(entries[19])).toHaveAttribute('aria-expanded', 'false')
    expect(toggleOf(entries[22])).toHaveAttribute('aria-expanded', 'false')
    // 原本 20 筆裡最近 3 筆維持展開
    expect(toggleOf(entries[2])).toHaveAttribute('aria-expanded', 'true')
  })
})
