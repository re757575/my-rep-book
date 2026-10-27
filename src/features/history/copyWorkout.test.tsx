import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { backupFixture, fixtureWorkout } from '@/test/backupFixture'
import { renderAppWithBackup } from '@/test/importBackup'
import { setTypeButton } from '@/test/setType'

/** 10/20：臥推熱身 40×10、60×8、一組沒填完的 60×?，備註「左肩不適」；深蹲只有空白的組；平板支撐 90 秒 */
const backup = backupFixture({
  workouts: [
    fixtureWorkout('2026-10-20', [
      {
        exerciseId: 'barbell-bench-press',
        note: '左肩不適',
        sets: [
          { type: 'weight_reps', weightKg: 40, reps: 10, setType: 'warmup' },
          { type: 'weight_reps', weightKg: 60, reps: 8 },
          { type: 'weight_reps', weightKg: 60, reps: null },
        ],
      },
      {
        exerciseId: 'barbell-squat',
        sets: [{ type: 'weight_reps', weightKg: null, reps: null }],
      },
      { exerciseId: 'plank', sets: [{ type: 'duration', durationSec: 90 }] },
    ]),
    fixtureWorkout('2026-10-21', [
      {
        exerciseId: 'barbell-squat',
        sets: [{ type: 'weight_reps', weightKg: null, reps: null }],
      },
    ]),
    fixtureWorkout('2026-10-24', [
      { exerciseId: 'deadlift', sets: [{ type: 'weight_reps', weightKg: 100, reps: 5 }] },
    ]),
  ],
})

/** 在歷史的月曆選某一天，回傳那天的日明細 */
async function openDayDetail(user: UserEvent, dayLabel: string, title: string) {
  await user.click(await screen.findByRole('button', { name: new RegExp(dayLabel) }))
  return screen.findByRole('region', { name: title })
}

/** 訓練頁上各訓練動作的名稱，依畫面順序 */
function exerciseOrder() {
  return screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)
}

describe('從過去某天複製訓練', () => {
  it('複製到今天：只複製完整的組與熱身標記，不含備註；今天已有的動作留在前面', async () => {
    const { user } = await renderAppWithBackup(backup, '/history')
    const detail = await openDayDetail(user, '10月20日', '10/20（二）')

    await user.click(await within(detail).findByRole('button', { name: '複製到今天' }))

    // 前往今天的訓練頁：先有原本的硬舉，後面接著複製進來的臥推與平板支撐
    expect(
      await screen.findByRole('heading', { level: 1, name: '10/24（六）' }),
    ).toBeInTheDocument()
    await waitFor(() => expect(exerciseOrder()).toEqual(['硬舉', '槓鈴臥推', '平板支撐']))
    expect(window.location.pathname).toBe(import.meta.env.BASE_URL)
    expect(await screen.findByText('已複製 2 個動作到今天')).toBeInTheDocument()

    const bench = screen.getByRole('region', { name: '槓鈴臥推' })
    expect(within(bench).getAllByRole('textbox', { name: /^第 \d+ 組/ })).toHaveLength(4)
    expect(within(bench).getByRole('textbox', { name: '第 1 組重量（kg）' })).toHaveValue('40')
    expect(setTypeButton(bench, 1)).toHaveAccessibleName('第 1 組類型：熱身')
    expect(within(bench).getByRole('textbox', { name: '第 2 組重量（kg）' })).toHaveValue('60')
    expect(within(bench).getByRole('textbox', { name: '第 2 組次數' })).toHaveValue('8')
    expect(within(bench).getByRole('textbox', { name: '備註' })).toHaveValue('')
    const plank = screen.getByRole('region', { name: '平板支撐' })
    expect(within(plank).getByRole('textbox', { name: '第 1 組時間（mm:ss）' })).toHaveValue(
      '01:30',
    )
  })

  it('復原：移除複製進來的動作，今天原本的訓練不受影響', async () => {
    const { user } = await renderAppWithBackup(backup, '/history')
    const detail = await openDayDetail(user, '10月20日', '10/20（二）')
    await user.click(await within(detail).findByRole('button', { name: '複製到今天' }))
    await waitFor(() => expect(exerciseOrder()).toEqual(['硬舉', '槓鈴臥推', '平板支撐']))

    await user.click(await screen.findByRole('button', { name: '復原' }))

    await waitFor(() => expect(exerciseOrder()).toEqual(['硬舉']))
  })

  it('沒有可複製的組時不新增也不離開歷史', async () => {
    const { user } = await renderAppWithBackup(backup, '/history')
    const detail = await openDayDetail(user, '10月21日', '10/21（三）')

    await user.click(await within(detail).findByRole('button', { name: '複製到今天' }))

    expect(await screen.findByText('這天沒有可複製的組')).toBeInTheDocument()
    expect(window.location.pathname).toBe(`${import.meta.env.BASE_URL}history`)
  })

  it('今天的明細與沒有訓練的日期沒有「複製到今天」', async () => {
    const { user } = await renderAppWithBackup(backup, '/history')

    // 先等一個有按鈕的日期載入完，再斷言其他日期沒有
    const past = await openDayDetail(user, '10月20日', '10/20（二）')
    await within(past).findByRole('button', { name: '複製到今天' })

    const todayDetail = await openDayDetail(user, '10月24日', '10/24（六）')
    await within(todayDetail).findByRole('link', { name: '編輯' })
    expect(
      within(todayDetail).queryByRole('button', { name: '複製到今天' }),
    ).not.toBeInTheDocument()

    const empty = await openDayDetail(user, '10月22日', '10/22（四）')
    await within(empty).findByText('這天沒有訓練')
    expect(within(empty).queryByRole('button', { name: '複製到今天' })).not.toBeInTheDocument()
  })
})
