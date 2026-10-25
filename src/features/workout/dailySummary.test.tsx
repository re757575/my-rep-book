import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

/** 從加入動作選單加入一個動作，回傳該訓練動作的區塊 */
async function addExercise(user: UserEvent, name: string) {
  await user.click(screen.getByRole('button', { name: '加入動作' }))
  const dialog = await screen.findByRole('dialog', { name: '加入動作' })
  await user.click(await within(dialog).findByRole('button', { name: new RegExp(`^${name}`) }))
  return screen.findByRole('region', { name })
}

/** 每日摘要中某一項的數值，例如「總訓練量」 */
async function summaryValue(name: string) {
  const summary = await screen.findByRole('region', { name: '每日摘要' })
  return within(summary).getByRole('definition', { name }).textContent
}

describe('訓練頁頂部的每日摘要', () => {
  it('記錄完後顯示動作數、正式組數、總訓練量與有氧總時間；熱身組與不完整的組不計入', async () => {
    const { user } = renderApp()

    // 槓鈴臥推：3 組 60kg×8，第 3 組標為熱身組
    const bench = await addExercise(user, '槓鈴臥推')
    await user.type(within(bench).getByRole('textbox', { name: '第 1 組重量（kg）' }), '60')
    await user.type(within(bench).getByRole('textbox', { name: '第 1 組次數' }), '8')
    await user.click(within(bench).getByRole('button', { name: '新增一組' }))
    await within(bench).findByRole('textbox', { name: '第 2 組重量（kg）' })
    await user.click(within(bench).getByRole('button', { name: '新增一組' }))
    const warmup = await within(bench).findByRole('button', { name: '第 3 組熱身' })
    await user.click(warmup)
    await waitFor(() => expect(warmup).toHaveAttribute('aria-pressed', 'true'))
    // 引體向上：額外負重不計入訓練量
    const pullUp = await addExercise(user, '引體向上')
    await user.type(within(pullUp).getByRole('textbox', { name: '第 1 組次數' }), '10')
    await user.type(within(pullUp).getByRole('textbox', { name: '第 1 組額外負重（kg）' }), '5')
    // 平板支撐：時間不計入有氧總時間
    const plank = await addExercise(user, '平板支撐')
    await user.type(within(plank).getByRole('textbox', { name: '第 1 組時間（mm:ss）' }), '1:30')
    // 跑步機：只填距離的組是不完整的組
    const treadmill = await addExercise(user, '跑步機')
    await user.type(within(treadmill).getByRole('textbox', { name: '第 1 組距離（km）' }), '5')
    await user.type(
      within(treadmill).getByRole('textbox', { name: '第 1 組時間（mm:ss）' }),
      '25:00',
    )
    await user.click(within(treadmill).getByRole('button', { name: '新增一組' }))
    await user.clear(
      await within(treadmill).findByRole('textbox', { name: '第 2 組時間（mm:ss）' }),
    )

    await waitFor(async () => expect(await summaryValue('正式組數')).toBe('5'))
    expect(await summaryValue('動作數')).toBe('4')
    expect(await summaryValue('總訓練量')).toBe('960 kg')
    expect(await summaryValue('有氧總時間')).toBe('25:00')
  })

  it('剛加入動作、組還沒填時，各項顯示 0；動作全部刪光後不再顯示摘要', async () => {
    const { user } = renderApp()

    const bench = await addExercise(user, '槓鈴臥推')

    expect(await summaryValue('動作數')).toBe('1')
    expect(await summaryValue('正式組數')).toBe('0')
    expect(await summaryValue('總訓練量')).toBe('0 kg')
    expect(await summaryValue('有氧總時間')).toBe('00:00')

    await user.click(within(bench).getByRole('button', { name: '刪除動作' }))

    await waitFor(() => expect(screen.queryByRole('region', { name: '每日摘要' })).toBeNull())
  })
})
