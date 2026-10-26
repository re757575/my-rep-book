import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

/** 訓練頁上的訓練動作數（每個訓練動作的標題是 h2） */
function workoutExerciseCount() {
  return screen.queryAllByRole('heading', { level: 2 }).length
}

/** 從加入動作選單的全部動作清單加入一個動作，回傳該訓練動作的區塊 */
async function addExercise(user: UserEvent, name: string) {
  const countBefore = workoutExerciseCount()
  await user.click(await screen.findByRole('button', { name: '加入動作' }))
  const dialog = await screen.findByRole('dialog', { name: '加入動作' })
  const list = await within(dialog).findByRole('list', { name: '動作清單' })
  await user.click(within(list).getByRole('button', { name: new RegExp(`^${name}`) }))
  await waitFor(() => expect(workoutExerciseCount()).toBe(countBefore + 1))
  return screen.getByRole('region', { name })
}

/** 動作名稱就是收合按鈕 */
function toggleOf(card: HTMLElement, name: string) {
  return within(card).getByRole('button', { name })
}

/** 臥推記錄 60kg×8 兩組（第二組由「新增一組」複製） */
async function recordBench(user: UserEvent) {
  const bench = await addExercise(user, '槓鈴臥推')
  await user.type(within(bench).getByRole('textbox', { name: '第 1 組重量（kg）' }), '60')
  await user.type(within(bench).getByRole('textbox', { name: '第 1 組次數' }), '8')
  await user.click(within(bench).getByRole('button', { name: '新增一組' }))
  await within(bench).findByRole('textbox', { name: '第 2 組次數' })
  return bench
}

describe('收合訓練動作', () => {
  it('點動作名稱收合：隱藏各組欄位、新增一組與備註，改顯示這個動作的總計', async () => {
    const { user } = renderApp()
    const bench = await recordBench(user)
    const toggle = toggleOf(bench, '槓鈴臥推')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(await within(bench).findByText('2 組 · 最重 60kg×8 · 訓練量 960 kg')).toBeInTheDocument()
    expect(
      within(bench).queryByRole('textbox', { name: '第 1 組重量（kg）' }),
    ).not.toBeInTheDocument()
    expect(within(bench).queryByRole('button', { name: '新增一組' })).not.toBeInTheDocument()
    expect(within(bench).queryByRole('textbox', { name: '備註' })).not.toBeInTheDocument()
    // 排序與刪除照常可用
    expect(within(bench).getByRole('button', { name: '刪除動作' })).toBeInTheDocument()
  })

  it('再點一次展開，各組欄位與輸入的值都還在', async () => {
    const { user } = renderApp()
    const bench = await recordBench(user)
    await user.click(toggleOf(bench, '槓鈴臥推'))
    await user.click(toggleOf(bench, '槓鈴臥推'))

    expect(toggleOf(bench, '槓鈴臥推')).toHaveAttribute('aria-expanded', 'true')
    expect(within(bench).getByRole('textbox', { name: '第 2 組重量（kg）' })).toHaveValue('60')
    expect(within(bench).queryByText(/^2 組 · /)).not.toBeInTheDocument()
  })

  it('收合狀態在重新整理後仍保留，且只影響被收合的動作', async () => {
    const { user, reload } = renderApp()
    const bench = await recordBench(user)
    await addExercise(user, '槓鈴深蹲')
    await user.click(toggleOf(bench, '槓鈴臥推'))

    reload()
    const benchAfter = await screen.findByRole('region', { name: '槓鈴臥推' })
    expect(toggleOf(benchAfter, '槓鈴臥推')).toHaveAttribute('aria-expanded', 'false')
    expect(within(benchAfter).getByText('2 組 · 最重 60kg×8 · 訓練量 960 kg')).toBeInTheDocument()
    const squat = screen.getByRole('region', { name: '槓鈴深蹲' })
    expect(toggleOf(squat, '槓鈴深蹲')).toHaveAttribute('aria-expanded', 'true')
    expect(within(squat).getByRole('textbox', { name: '第 1 組重量（kg）' })).toBeInTheDocument()
  })

  it('還沒有完整的正式組時，收合後顯示「尚未記錄正式組」', async () => {
    const { user } = renderApp()
    const bench = await addExercise(user, '槓鈴臥推')
    await user.click(toggleOf(bench, '槓鈴臥推'))
    expect(within(bench).getByText('尚未記錄正式組')).toBeInTheDocument()
  })
})
