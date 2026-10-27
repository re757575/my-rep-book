import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { backupFixture, fixtureWorkout } from '@/test/backupFixture'
import { renderAppWithBackup } from '@/test/importBackup'
import { renderApp } from '@/test/renderApp'
import { unlockDay } from '@/test/unlockDay'

/** 從加入動作選單加入一個動作，回傳該訓練動作的區塊 */
async function addExercise(user: UserEvent, name: string) {
  await unlockDay(user)
  await user.click(screen.getByRole('button', { name: '加入動作' }))
  const dialog = await screen.findByRole('dialog', { name: '加入動作' })
  await user.click(await within(dialog).findByRole('button', { name: new RegExp(`^${name}`) }))
  return screen.findByRole('region', { name })
}

describe('−／+ 微調數值', () => {
  it('重量一階 2.5 kg、次數一階 1；連按以畫面上的值為準，重新整理後仍保留', async () => {
    const { user, reload } = renderApp()
    const card = await addExercise(user, '槓鈴臥推')

    // 空白的欄位按 + 從 0 起算（次數從 1），按 − 不動
    expect(within(card).getByRole('button', { name: '減少第 1 組重量（kg）' })).toBeDisabled()
    expect(within(card).getByRole('button', { name: '減少第 1 組次數' })).toBeDisabled()
    const weightPlus = within(card).getByRole('button', { name: '增加第 1 組重量（kg）' })
    await user.click(weightPlus)
    await user.click(weightPlus)
    await user.click(weightPlus)
    expect(within(card).getByRole('textbox', { name: '第 1 組重量（kg）' })).toHaveValue('7.5')
    const repsPlus = within(card).getByRole('button', { name: '增加第 1 組次數' })
    await user.click(repsPlus)
    await user.click(repsPlus)
    await user.click(within(card).getByRole('button', { name: '減少第 1 組次數' }))
    expect(within(card).getByRole('textbox', { name: '第 1 組次數' })).toHaveValue('1')
    // 次數最少 1：已經是 1 就不能再減
    expect(within(card).getByRole('button', { name: '減少第 1 組次數' })).toBeDisabled()

    reload()

    const reloaded = await screen.findByRole('region', { name: '槓鈴臥推' })
    await waitFor(() =>
      expect(within(reloaded).getByRole('textbox', { name: '第 1 組重量（kg）' })).toHaveValue(
        '7.5',
      ),
    )
    expect(within(reloaded).getByRole('textbox', { name: '第 1 組次數' })).toHaveValue('1')
  })

  it('輸入到一半不合法的值時，按 + 從上一個合法的值算，並清除錯誤', async () => {
    const { user } = renderApp()
    const card = await addExercise(user, '槓鈴臥推')
    const weight = within(card).getByRole('textbox', { name: '第 1 組重量（kg）' })

    await user.type(weight, '60')
    await user.type(weight, 'x')
    expect(weight).toBeInvalid()
    await user.click(within(card).getByRole('button', { name: '增加第 1 組重量（kg）' }))

    expect(weight).toHaveValue('62.5')
    expect(weight).toBeValid()
  })

  it('額外負重也能微調；時間與距離欄位沒有 −／+', async () => {
    const { user } = renderApp()
    const pullUp = await addExercise(user, '引體向上')
    await user.click(within(pullUp).getByRole('button', { name: '增加第 1 組額外負重（kg）' }))
    expect(within(pullUp).getByRole('textbox', { name: '第 1 組額外負重（kg）' })).toHaveValue(
      '2.5',
    )

    const plank = await addExercise(user, '平板支撐')
    expect(within(plank).queryByRole('button', { name: /^(增加|減少)/ })).not.toBeInTheDocument()
  })

  it('鎖定時不顯示 −／+', async () => {
    const { user } = await renderAppWithBackup(
      backupFixture({
        workouts: [
          fixtureWorkout('2026-10-20', [
            {
              exerciseId: 'barbell-bench-press',
              sets: [{ type: 'weight_reps', weightKg: 60, reps: 8 }],
            },
          ]),
        ],
      }),
      '/day/2026-10-20',
    )
    const card = await screen.findByRole('region', { name: '槓鈴臥推' })
    expect(within(card).queryByRole('button', { name: /^(增加|減少)/ })).not.toBeInTheDocument()

    await unlockDay(user)
    expect(within(card).getByRole('button', { name: '增加第 1 組重量（kg）' })).toBeInTheDocument()
  })
})
