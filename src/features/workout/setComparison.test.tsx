import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { backupFixture, fixtureWorkout } from '@/test/backupFixture'
import { renderAppWithBackup } from '@/test/importBackup'
import { unlockDay } from '@/test/unlockDay'

/** 10/20：槓鈴臥推熱身 40×10，正式組 60×8、60×8、62.5×6；引體向上 8 下 */
const backup = backupFixture({
  workouts: [
    fixtureWorkout('2026-10-20', [
      {
        exerciseId: 'barbell-bench-press',
        sets: [
          { type: 'weight_reps', weightKg: 40, reps: 10, isWarmup: true },
          { type: 'weight_reps', weightKg: 60, reps: 8 },
          { type: 'weight_reps', weightKg: 60, reps: 8 },
          { type: 'weight_reps', weightKg: 62.5, reps: 6 },
        ],
      },
    ]),
  ],
})

/** 從加入動作選單的全部動作清單加入一個動作，回傳該訓練動作的區塊 */
async function addExercise(user: UserEvent, name: string) {
  await unlockDay(user)
  await user.click(screen.getByRole('button', { name: '加入動作' }))
  const dialog = await screen.findByRole('dialog', { name: '加入動作' })
  const list = await within(dialog).findByRole('list', { name: '動作清單' })
  await user.click(await within(list).findByRole('button', { name: new RegExp(`^${name}`) }))
  return screen.findByRole('region', { name })
}

/** 每一組（`<li>`）旁顯示的「上次 …」文字，沒有時為 null；熱身標記的按鈕也在列裡，所以只取這個前綴的文字 */
function lastHints(card: HTMLElement) {
  return within(card)
    .getAllByRole('listitem')
    .map((row) => within(row).queryByText(/^上次 /)?.textContent ?? null)
}

describe('逐組對照上次', () => {
  it('第 N 個正式組對照上次的第 N 個正式組；新增一組後對照下一組，超出的組沒有', async () => {
    const { user } = await renderAppWithBackup(backup)
    const card = await addExercise(user, '槓鈴臥推')
    // 加入時只有預填的第一組；它對照上次的第 1 個正式組
    await waitFor(() => expect(lastHints(card)).toEqual(['上次 60kg×8']))

    await user.click(within(card).getByRole('button', { name: '新增一組' }))
    await user.click(within(card).getByRole('button', { name: '新增一組' }))
    await waitFor(() =>
      expect(lastHints(card)).toEqual(['上次 60kg×8', '上次 60kg×8', '上次 62.5kg×6']),
    )

    await user.click(within(card).getByRole('button', { name: '新增一組' }))
    await within(card).findByRole('textbox', { name: '第 4 組次數' })
    expect(lastHints(card)).toEqual(['上次 60kg×8', '上次 60kg×8', '上次 62.5kg×6', null])
  })

  it('熱身組不顯示，切換熱身與刪除後依順序重新對齊', async () => {
    const { user } = await renderAppWithBackup(backup)
    const card = await addExercise(user, '槓鈴臥推')
    await user.click(within(card).getByRole('button', { name: '新增一組' }))
    await user.click(within(card).getByRole('button', { name: '新增一組' }))
    await waitFor(() => expect(lastHints(card)).toHaveLength(3))

    await user.click(within(card).getByRole('button', { name: '第 1 組熱身' }))
    await waitFor(() => expect(lastHints(card)).toEqual([null, '上次 60kg×8', '上次 60kg×8']))

    await user.click(within(card).getByRole('button', { name: '刪除第 2 組' }))
    await waitFor(() => expect(lastHints(card)).toEqual([null, '上次 60kg×8']))
  })

  it('沒有上次紀錄的動作不顯示', async () => {
    const { user } = await renderAppWithBackup(backup)
    const bench = await addExercise(user, '槓鈴臥推')
    await waitFor(() => expect(lastHints(bench)).toEqual(['上次 60kg×8']))

    const squat = await addExercise(user, '槓鈴深蹲')
    await within(squat).findByRole('textbox', { name: '第 1 組次數' })
    expect(lastHints(squat)).toEqual([null])
  })

  it('單位跟隨設定，過去的日期（鎖定）也顯示', async () => {
    await renderAppWithBackup(
      backupFixture({
        workouts: [
          ...backup.data.workouts,
          fixtureWorkout('2026-10-22', [
            {
              exerciseId: 'barbell-bench-press',
              sets: [{ type: 'weight_reps', weightKg: 65, reps: 5 }],
            },
          ]),
        ],
        settings: { weightUnit: 'lb' },
      }),
      '/day/2026-10-22',
    )
    const card = await screen.findByRole('region', { name: '槓鈴臥推' })
    // 10/20 的第 1 個正式組 60 kg = 132.3 lb
    await waitFor(() => expect(lastHints(card)).toEqual(['上次 132.3lb×8']))
  })
})
