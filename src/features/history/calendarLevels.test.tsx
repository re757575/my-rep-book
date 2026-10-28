import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { backupFixture, fixtureWorkout } from '@/test/backupFixture'
import { renderAppWithBackup } from '@/test/importBackup'

const sets = (count: number, extra: object = {}) =>
  Array.from(
    { length: count },
    () => ({ type: 'weight_reps', weightKg: 60, reps: 8, ...extra }) as const,
  )

/** 某一天做了臥推 `count` 組 */
const day = (date: string, count: number, extra: object = {}) =>
  fixtureWorkout(date, [{ exerciseId: 'barbell-bench-press', sets: sets(count, extra) }])

/**
 * 10/19：從範本加入還沒做（3 組都未完成）→ 尚未完成任何組；10/20：8 組 → 少；10/21：9 組 → 中；
 * 10/22：16 組 → 中；10/23：17 組 → 多；10/17：只有熱身組 → 尚未完成任何組
 */
const backup = backupFixture({
  workouts: [
    fixtureWorkout('2026-10-17', [
      {
        exerciseId: 'barbell-bench-press',
        sets: [{ type: 'weight_reps', weightKg: 40, reps: 10, setType: 'warmup' }],
      },
    ]),
    day('2026-10-19', 3, { done: false }),
    day('2026-10-20', 8),
    day('2026-10-21', 9),
    day('2026-10-22', 16),
    day('2026-10-23', 17),
  ],
})

/** 月曆上某一天的按鈕 */
function dayButton(dayLabel: RegExp) {
  return screen.findByRole('button', { name: dayLabel })
}

describe('月曆標點依組數分級（US-48）', () => {
  it('日期按鈕的名稱依級別加上說明：少、中、多、尚未完成任何組；沒有訓練的日期沒有', async () => {
    await renderAppWithBackup(backup, '/history')

    await waitFor(async () =>
      expect(await dayButton(/10月20日/)).toHaveAccessibleName(/，有訓練（組數少）$/),
    )
    expect(await dayButton(/10月21日/)).toHaveAccessibleName(/，有訓練（組數中等）$/)
    expect(await dayButton(/10月22日/)).toHaveAccessibleName(/，有訓練（組數中等）$/)
    expect(await dayButton(/10月23日/)).toHaveAccessibleName(/，有訓練（組數多）$/)
    expect(await dayButton(/10月19日/)).toHaveAccessibleName(/，有訓練（尚未完成任何組）$/)
    expect(await dayButton(/10月17日/)).toHaveAccessibleName(/，有訓練（尚未完成任何組）$/)
    expect(await dayButton(/10月18日/)).not.toHaveAccessibleName(/有訓練/)
  })

  it('標點的級別（data-level）與日期按鈕的名稱一致；沒有訓練的日期沒有標點', async () => {
    await renderAppWithBackup(backup, '/history')
    await waitFor(async () => expect(await dayButton(/10月23日/)).toHaveAccessibleName(/有訓練/))

    const levelOf = async (label: RegExp) =>
      (await dayButton(label)).querySelector('[data-level]')?.getAttribute('data-level') ?? null
    expect(await levelOf(/10月20日/)).toBe('low')
    expect(await levelOf(/10月21日/)).toBe('medium')
    expect(await levelOf(/10月23日/)).toBe('high')
    expect(await levelOf(/10月19日/)).toBe('none')
    expect(await levelOf(/10月18日/)).toBeNull()
  })

  it('選取的日期照樣有標點與級別說明', async () => {
    const { user } = await renderAppWithBackup(backup, '/history')
    const button = await dayButton(/10月23日/)
    await waitFor(() => expect(button).toHaveAccessibleName(/有訓練/))

    await user.click(button)

    await waitFor(() => expect(button).toHaveAccessibleName(/，已選取/))
    expect(button).toHaveAccessibleName(/組數多/)
    expect(button.querySelector('[data-level="high"]')).not.toBeNull()
  })

  it('圖例列出四種標點與組數範圍', async () => {
    await renderAppWithBackup(backup, '/history')

    const legend = await screen.findByRole('list', { name: '月曆標點圖例' })
    expect(
      within(legend)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['少 1–8 組', '中 9–16 組', '多 17 組以上', '尚未完成任何組'])
  })

  it('切到上個月，那個月的訓練也依組數分級', async () => {
    const { user } = await renderAppWithBackup(
      backupFixture({ workouts: [day('2026-09-15', 20)] }),
      '/history',
    )
    await user.click(await screen.findByRole('button', { name: '前往上個月' }))

    await waitFor(async () =>
      expect(await dayButton(/9月15日/)).toHaveAccessibleName(/，有訓練（組數多）/),
    )
  })
})
