import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { backupFixture, fixtureWorkout } from '@/test/backupFixture'
import { renderAppWithBackup } from '@/test/importBackup'
import { unlockDay } from '@/test/unlockDay'

/** 10/15：62.5×5（1RM 72.9，第一次訓練）；10/20：60×10（1RM 80）→ 之前的最大重量 62.5×5、最高 1RM 80 */
const backup = backupFixture({
  workouts: [
    fixtureWorkout('2026-10-15', [
      {
        exerciseId: 'barbell-bench-press',
        sets: [{ type: 'weight_reps', weightKg: 62.5, reps: 5 }],
      },
    ]),
    fixtureWorkout('2026-10-20', [
      {
        exerciseId: 'barbell-bench-press',
        sets: [{ type: 'weight_reps', weightKg: 60, reps: 10 }],
      },
    ]),
  ],
})

/** 從加入動作選單加入一個動作，回傳該訓練動作的區塊 */
async function addExercise(user: UserEvent, name: string) {
  await unlockDay(user)
  await user.click(screen.getByRole('button', { name: '加入動作' }))
  const dialog = await screen.findByRole('dialog', { name: '加入動作' })
  const list = await within(dialog).findByRole('list', { name: '動作清單' })
  await user.click(await within(list).findByRole('button', { name: new RegExp(`^${name}`) }))
  return screen.findByRole('region', { name })
}

/** 基準等頁面閒置後才讀取（jsdom 沒有 requestIdleCallback，延後 500 ms），比 findBy 預設的 1 秒逾時寬裕 */
const BASELINE_LOADED = { timeout: 3000 }

describe('記錄當下標示新紀錄', () => {
  it('超過之前的最大重量與估算 1RM 時，在那一組旁標示；改回去就消失', async () => {
    const { user } = await renderAppWithBackup(backup)
    const card = await addExercise(user, '槓鈴臥推')
    // 預填上次的 60×10：1RM 80 追平，不算新紀錄
    expect(within(card).getByRole('textbox', { name: '第 1 組重量（kg）' })).toHaveValue('60')

    await user.click(within(card).getByRole('button', { name: '增加第 1 組重量（kg）' }))

    // 62.5×10：次數比 62.5×5 多，1RM 83.3 超過 80
    expect(
      await within(card).findByText('重量新紀錄', undefined, BASELINE_LOADED),
    ).toBeInTheDocument()
    expect(within(card).getByText('1RM 新紀錄')).toBeInTheDocument()

    await user.click(within(card).getByRole('button', { name: '減少第 1 組重量（kg）' }))
    await waitFor(() => expect(within(card).queryByText('重量新紀錄')).not.toBeInTheDocument())
    expect(within(card).queryByText('1RM 新紀錄')).not.toBeInTheDocument()
  })

  it('同一天連續兩組一樣的，只標示第一組；熱身組不標示', async () => {
    const { user } = await renderAppWithBackup(backup)
    const card = await addExercise(user, '槓鈴臥推')
    await user.click(within(card).getByRole('button', { name: '增加第 1 組重量（kg）' }))
    await within(card).findByText('重量新紀錄', undefined, BASELINE_LOADED)

    await user.click(within(card).getByRole('button', { name: '新增一組' }))
    await within(card).findByRole('textbox', { name: '第 2 組次數' })
    await user.click(within(card).getByRole('button', { name: '新增一組' }))
    await within(card).findByRole('textbox', { name: '第 3 組次數' })

    expect(within(card).getAllByText('重量新紀錄')).toHaveLength(1)
    expect(within(card).getAllByText('1RM 新紀錄')).toHaveLength(1)

    // 第 1 組改成熱身：不計入，標示換到第 2 組
    await user.click(within(card).getByRole('button', { name: '第 1 組熱身' }))
    await waitFor(() => {
      const rows = within(card).getAllByRole('listitem')
      expect(within(rows[0]).queryByText('重量新紀錄')).not.toBeInTheDocument()
      expect(within(rows[1]).getByText('重量新紀錄')).toBeInTheDocument()
    })
  })

  it('過去的日期也標示，比較對象是那天之前的訓練', async () => {
    await renderAppWithBackup(backup, '/day/2026-10-20')
    const card = await screen.findByRole('region', { name: '槓鈴臥推' })

    // 60×10 的 1RM 80 超過 10/15 的 72.9，但沒有比 62.5×5 重
    expect(
      await within(card).findByText('1RM 新紀錄', undefined, BASELINE_LOADED),
    ).toBeInTheDocument()
    expect(within(card).queryByText('重量新紀錄')).not.toBeInTheDocument()
  })
})
