import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { backupFixture, fixtureBodyWeight, fixtureWorkout } from '@/test/backupFixture'
import { renderAppWithBackup } from '@/test/importBackup'
import { renderApp } from '@/test/renderApp'
import { unlockDay } from '@/test/unlockDay'

/** 10/20：臥推熱身 40×10、60×8，備註「左肩不適」；體重 72.5 kg */
const backup = backupFixture({
  workouts: [
    fixtureWorkout('2026-10-20', [
      {
        exerciseId: 'barbell-bench-press',
        note: '左肩不適',
        sets: [
          { type: 'weight_reps', weightKg: 40, reps: 10, isWarmup: true },
          { type: 'weight_reps', weightKg: 60, reps: 8 },
        ],
      },
    ]),
  ],
  bodyWeights: [fixtureBodyWeight('2026-10-20', 72.5)],
})

/** 鎖定開關是 Toggle：按下（aria-pressed）表示鎖定 */
function lockToggle() {
  return screen.findByRole('button', { name: '鎖定' })
}

describe('鎖定訓練頁', () => {
  it('今天預設不鎖定', async () => {
    renderApp()
    expect(await lockToggle()).toHaveAttribute('aria-pressed', 'false')
    expect(await lockToggle()).toHaveAccessibleDescription('可以修改這天的紀錄')
    expect(screen.getByRole('button', { name: '加入動作' })).toBeInTheDocument()
  })

  it('非今天預設鎖定：數值與備註唯讀，熱身標記停用，新增、刪除、排序都不顯示', async () => {
    await renderAppWithBackup(backup, '/day/2026-10-20')
    expect(await lockToggle()).toHaveAttribute('aria-pressed', 'true')
    expect(await lockToggle()).toHaveAccessibleDescription('已鎖定，不能修改這天的紀錄')

    const bench = await screen.findByRole('region', { name: '槓鈴臥推' })
    const weight = within(bench).getByRole('textbox', { name: '第 2 組重量（kg）' })
    expect(weight).toHaveAttribute('readonly')
    expect(within(bench).getByRole('textbox', { name: '備註' })).toHaveAttribute('readonly')
    expect(screen.getByRole('textbox', { name: '體重（kg）' })).toHaveAttribute('readonly')
    expect(within(bench).getByRole('button', { name: '第 1 組熱身' })).toBeDisabled()
    for (const name of ['新增一組', '刪除第 1 組', '上移', '下移', '刪除動作']) {
      expect(within(bench).queryByRole('button', { name })).not.toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: '加入動作' })).not.toBeInTheDocument()
  })

  it('鎖定時輸入不會改到紀錄', async () => {
    const { user, reload } = await renderAppWithBackup(backup, '/day/2026-10-20')
    const bench = await screen.findByRole('region', { name: '槓鈴臥推' })
    await user.type(within(bench).getByRole('textbox', { name: '第 2 組次數' }), '9')

    reload()
    const benchAfter = await screen.findByRole('region', { name: '槓鈴臥推' })
    expect(within(benchAfter).getByRole('textbox', { name: '第 2 組次數' })).toHaveValue('8')
  })

  it('鎖定時沒有體重與備註的欄位不顯示', async () => {
    await renderAppWithBackup(
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
    const bench = await screen.findByRole('region', { name: '槓鈴臥推' })
    expect(within(bench).queryByRole('textbox', { name: '備註' })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: '體重（kg）' })).not.toBeInTheDocument()
  })

  it('解鎖後可以修改；重新整理後回到預設的鎖定，修改仍在', async () => {
    const { user, reload } = await renderAppWithBackup(backup, '/day/2026-10-20')
    await unlockDay(user)
    const bench = await screen.findByRole('region', { name: '槓鈴臥推' })
    const reps = within(bench).getByRole('textbox', { name: '第 2 組次數' })
    await user.clear(reps)
    await user.type(reps, '10')
    expect(within(bench).getByRole('button', { name: '新增一組' })).toBeInTheDocument()

    reload()
    expect(await lockToggle()).toHaveAttribute('aria-pressed', 'true')
    const benchAfter = await screen.findByRole('region', { name: '槓鈴臥推' })
    expect(within(benchAfter).getByRole('textbox', { name: '第 2 組次數' })).toHaveValue('10')
  })

  it('今天也可以手動鎖定', async () => {
    const { user } = renderApp()
    await user.click(await lockToggle())
    expect(await lockToggle()).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('button', { name: '加入動作' })).not.toBeInTheDocument()
  })

  it('鎖定時照常可以收合動作', async () => {
    const { user } = await renderAppWithBackup(backup, '/day/2026-10-20')
    const bench = await screen.findByRole('region', { name: '槓鈴臥推' })
    await user.click(within(bench).getByRole('button', { name: '槓鈴臥推' }))
    expect(within(bench).getByText('1 組 · 最重 60kg×8 · 訓練量 480 kg')).toBeInTheDocument()
  })

  it('從歷史日明細的「編輯」進入時直接解鎖', async () => {
    const { user } = await renderAppWithBackup(backup, '/history')
    const grid = await screen.findByRole('grid')
    await user.click(within(grid).getByRole('button', { name: /10月20日/ }))
    const detail = await screen.findByRole('region', { name: '10/20（二）' })
    await user.click(within(detail).getByRole('link', { name: '編輯' }))

    await screen.findByRole('heading', { level: 1, name: '10/20（二）' })
    expect(await lockToggle()).toHaveAttribute('aria-pressed', 'false')
  })
})
