import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { backupFixture, fixtureWorkout, type FixtureSet } from '@/test/backupFixture'
import { renderAppWithBackup } from '@/test/importBackup'

const ws = (weightKg: number, reps: number, isWarmup = false): FixtureSet => ({
  type: 'weight_reps',
  weightKg,
  reps,
  setType: isWarmup ? 'warmup' : 'regular',
})

/**
 * 本週（10/19–10/25）：10/20 臥推 2 組（另有熱身）＋深蹲 1 組、10/22 硬舉 1 組
 * 上週：10/12 臥推 1 組；9 月：9/30 深蹲 1 組
 */
const backup = backupFixture({
  workouts: [
    fixtureWorkout('2026-09-30', [{ exerciseId: 'barbell-squat', sets: [ws(90, 5)] }]),
    fixtureWorkout('2026-10-12', [{ exerciseId: 'barbell-bench-press', sets: [ws(55, 8)] }]),
    fixtureWorkout('2026-10-20', [
      { exerciseId: 'barbell-bench-press', sets: [ws(40, 10, true), ws(60, 8), ws(60, 8)] },
      { exerciseId: 'barbell-squat', sets: [ws(100, 5)] },
    ]),
    fixtureWorkout('2026-10-22', [{ exerciseId: 'deadlift', sets: [ws(140, 5)] }]),
  ],
})

function statsRegion() {
  return screen.findByRole('region', { name: '統計' })
}

/** 統計的 [區間, 訓練天數, 正式組數, 總訓練量] */
async function summary() {
  const region = await statsRegion()
  const value = (name: string) => within(region).getByRole('definition', { name }).textContent
  return [
    within(region).getByText(/^本週$|–|年/).textContent,
    value('訓練天數'),
    value('正式組數'),
    value('總訓練量'),
  ]
}

/** 各部位組數中組數大於 0 的分類，例如 `['胸', '2 組']` */
async function categorySets() {
  const list = within(await statsRegion()).getByRole('list', { name: '各部位組數' })
  return within(list)
    .getAllByRole('listitem')
    .map((item) => [...item.children].map((child) => child.textContent))
    .map(([label, , count]) => [label, count])
    .filter(([, count]) => count !== '0 組')
}

async function choosePeriod(user: UserEvent, period: '週' | '月') {
  const group = within(await statsRegion()).getByRole('radiogroup', { name: '統計區間' })
  await user.click(within(group).getByRole('radio', { name: period }))
}

describe('歷史頁的每週／每月統計', () => {
  it('預設顯示本週：訓練天數、正式組數（不含熱身組）、總訓練量與各部位組數', async () => {
    await renderAppWithBackup(backup, '/history')

    await waitFor(async () => expect(await summary()).toEqual(['本週', '2 天', '4', '2,160 kg']))
    expect(await categorySets()).toEqual([
      ['胸', '2 組'],
      ['背', '1 組'],
      ['腿：股四頭／臀', '1 組'],
    ])
    // 10 大類全部列出，0 組的也列
    const list = within(await statsRegion()).getByRole('list', { name: '各部位組數' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(10)
  })

  it('切到「月」顯示月曆目前月份的統計，換月份時跟著變', async () => {
    const { user } = await renderAppWithBackup(backup, '/history')

    await choosePeriod(user, '月')
    await waitFor(async () =>
      expect(await summary()).toEqual(['2026年10月', '3 天', '5', '2,600 kg']),
    )

    await user.click(screen.getByRole('button', { name: '前往上個月' }))
    await waitFor(async () => expect(await summary()).toEqual(['2026年9月', '1 天', '1', '450 kg']))
    expect(await categorySets()).toEqual([['腿：股四頭／臀', '1 組']])
  })

  it('點月曆上的日期時，週統計改為那一週', async () => {
    const { user } = await renderAppWithBackup(backup, '/history')
    await statsRegion()

    await user.click(within(screen.getByRole('grid')).getByRole('button', { name: /10月14日/ }))
    await waitFor(async () =>
      expect(await summary()).toEqual(['10/12（一） – 10/18（日）', '1 天', '1', '440 kg']),
    )
  })

  it('這段期間沒有訓練時顯示提示，不列出各部位組數', async () => {
    const { user } = await renderAppWithBackup(backup, '/history')
    await statsRegion()

    await user.click(within(screen.getByRole('grid')).getByRole('button', { name: /10月6日/ }))
    await waitFor(async () =>
      expect(await summary()).toEqual(['10/5（一） – 10/11（日）', '0 天', '0', '0 kg']),
    )
    expect(within(await statsRegion()).getByText('這段期間沒有訓練')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: '各部位組數' })).not.toBeInTheDocument()
  })
})
