import { screen, within } from '@testing-library/react'
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

function fieldNames(card: HTMLElement) {
  // 只看組的欄位（「第 N 組…」），不含訓練動作的備註欄
  return within(card)
    .getAllByRole('textbox', { name: /^第 \d+ 組/ })
    .map((input) => input.getAttribute('aria-label'))
}

describe('每種記錄類型只顯示自己的欄位', () => {
  it('次數（引體向上）：次數與選填的額外負重', async () => {
    const { user } = renderApp()

    const card = await addExercise(user, '引體向上')

    expect(fieldNames(card)).toEqual(['第 1 組次數', '第 1 組額外負重（kg）'])
    expect(within(card).getByRole('textbox', { name: '第 1 組次數' })).toHaveAttribute(
      'inputmode',
      'numeric',
    )
    expect(within(card).getByRole('textbox', { name: '第 1 組額外負重（kg）' })).toHaveAttribute(
      'inputmode',
      'decimal',
    )
  })

  it('時間（平板支撐）：只有時間（mm:ss）', async () => {
    const { user } = renderApp()

    const card = await addExercise(user, '平板支撐')

    expect(fieldNames(card)).toEqual(['第 1 組時間（mm:ss）'])
    expect(within(card).getByRole('textbox', { name: '第 1 組時間（mm:ss）' })).toHaveAttribute(
      'inputmode',
      'numeric',
    )
  })

  it('距離＋時間（跑步機）：距離（km）與時間（mm:ss）', async () => {
    const { user } = renderApp()

    const card = await addExercise(user, '跑步機')

    expect(fieldNames(card)).toEqual(['第 1 組距離（km）', '第 1 組時間（mm:ss）'])
    expect(within(card).getByRole('textbox', { name: '第 1 組距離（km）' })).toHaveAttribute(
      'inputmode',
      'decimal',
    )
  })

  it('重量×次數（槓鈴臥推）：重量與次數', async () => {
    const { user } = renderApp()

    const card = await addExercise(user, '槓鈴臥推')

    expect(fieldNames(card)).toEqual(['第 1 組重量（kg）', '第 1 組次數'])
  })
})

describe('記錄其他三種類型，重新整理後仍在', () => {
  it('次數、時間、距離＋時間的數值自動儲存；時間以 mm:ss 顯示', async () => {
    const { user, reload } = renderApp()
    const pullUp = await addExercise(user, '引體向上')
    await user.type(within(pullUp).getByRole('textbox', { name: '第 1 組次數' }), '10')
    await user.type(within(pullUp).getByRole('textbox', { name: '第 1 組額外負重（kg）' }), '5')
    const plank = await addExercise(user, '平板支撐')
    await user.type(within(plank).getByRole('textbox', { name: '第 1 組時間（mm:ss）' }), '1:30')
    const treadmill = await addExercise(user, '跑步機')
    await user.type(within(treadmill).getByRole('textbox', { name: '第 1 組距離（km）' }), '5.25')
    // 手機的數字鍵盤沒有冒號：只打數字時，最後兩位是秒
    await user.type(
      within(treadmill).getByRole('textbox', { name: '第 1 組時間（mm:ss）' }),
      '2500',
    )

    reload()

    const reloadedPullUp = await screen.findByRole('region', { name: '引體向上' })
    expect(within(reloadedPullUp).getByRole('textbox', { name: '第 1 組次數' })).toHaveValue('10')
    expect(
      within(reloadedPullUp).getByRole('textbox', { name: '第 1 組額外負重（kg）' }),
    ).toHaveValue('5')
    expect(
      within(screen.getByRole('region', { name: '平板支撐' })).getByRole('textbox', {
        name: '第 1 組時間（mm:ss）',
      }),
    ).toHaveValue('01:30')
    const reloadedTreadmill = screen.getByRole('region', { name: '跑步機' })
    expect(
      within(reloadedTreadmill).getByRole('textbox', { name: '第 1 組距離（km）' }),
    ).toHaveValue('5.25')
    expect(
      within(reloadedTreadmill).getByRole('textbox', { name: '第 1 組時間（mm:ss）' }),
    ).toHaveValue('25:00')
  })

  it('「新增一組」複製上一組的時間', async () => {
    const { user } = renderApp()
    const plank = await addExercise(user, '平板支撐')
    await user.type(within(plank).getByRole('textbox', { name: '第 1 組時間（mm:ss）' }), '0:45')

    await user.click(within(plank).getByRole('button', { name: '新增一組' }))

    expect(await within(plank).findByRole('textbox', { name: '第 2 組時間（mm:ss）' })).toHaveValue(
      '00:45',
    )
  })
})

describe('輸入驗證', () => {
  it.each([
    ['槓鈴臥推', '第 1 組重量（kg）', '-5', '不可小於 0'],
    ['槓鈴臥推', '第 1 組重量（kg）', '62.555', '最多 2 位小數'],
    ['槓鈴臥推', '第 1 組次數', '0', '請輸入 1–9999 的整數'],
    ['引體向上', '第 1 組額外負重（kg）', '-1', '不可小於 0'],
    ['平板支撐', '第 1 組時間（mm:ss）', '1:75', '秒數須為 0–59'],
    ['平板支撐', '第 1 組時間（mm:ss）', '00:00', '時間須大於 0'],
    ['跑步機', '第 1 組距離（km）', '5.125', '最多 2 位小數'],
  ])('%s 的「%s」輸入 %s：欄位下方顯示「%s」', async (exercise, label, text, error) => {
    const { user } = renderApp()
    const card = await addExercise(user, exercise)
    const field = within(card).getByRole('textbox', { name: label })

    await user.type(field, text)

    expect(field).toBeInvalid()
    expect(field).toHaveAccessibleDescription(error)
  })

  it('改回合法的值後，錯誤訊息消失', async () => {
    const { user } = renderApp()
    const card = await addExercise(user, '槓鈴臥推')
    const reps = within(card).getByRole('textbox', { name: '第 1 組次數' })
    await user.type(reps, '0')
    expect(reps).toHaveAccessibleDescription('請輸入 1–9999 的整數')

    await user.clear(reps)
    await user.type(reps, '8')

    expect(reps).toBeValid()
    expect(within(card).queryByText('請輸入 1–9999 的整數')).not.toBeInTheDocument()
  })

  it('重新整理後，不合法的值沒有被保存：保留上一個合法值或空白', async () => {
    const { user, reload } = renderApp()
    const bench = await addExercise(user, '槓鈴臥推')
    const weight = within(bench).getByRole('textbox', { name: '第 1 組重量（kg）' })
    // 一字一字輸入：60.55 合法並寫入，再多打一位小數的 60.555 不合法
    await user.type(weight, '60.555')
    expect(weight).toBeInvalid()
    await user.type(within(bench).getByRole('textbox', { name: '第 1 組次數' }), '0')
    const plank = await addExercise(user, '平板支撐')
    const duration = within(plank).getByRole<HTMLInputElement>('textbox', {
      name: '第 1 組時間（mm:ss）',
    })
    await user.type(duration, '1:30')
    // 選取全部再改打 00:60：打字過程中的每個值都不合法，所以一直保留 1:30
    await user.type(duration, '00:60', {
      initialSelectionStart: 0,
      initialSelectionEnd: duration.value.length,
    })
    expect(duration).toBeInvalid()

    reload()

    const reloadedBench = await screen.findByRole('region', { name: '槓鈴臥推' })
    expect(within(reloadedBench).getByRole('textbox', { name: '第 1 組重量（kg）' })).toHaveValue(
      '60.55',
    )
    expect(within(reloadedBench).getByRole('textbox', { name: '第 1 組次數' })).toHaveValue('')
    expect(
      within(screen.getByRole('region', { name: '平板支撐' })).getByRole('textbox', {
        name: '第 1 組時間（mm:ss）',
      }),
    ).toHaveValue('01:30')
    for (const field of screen.getAllByRole('textbox')) expect(field).toBeValid()
  })

  it('允許存在沒填完的組：額外負重留空也會保存次數', async () => {
    const { user, reload } = renderApp()
    const pullUp = await addExercise(user, '引體向上')
    await user.type(within(pullUp).getByRole('textbox', { name: '第 1 組次數' }), '12')

    reload()

    const reloaded = await screen.findByRole('region', { name: '引體向上' })
    expect(within(reloaded).getByRole('textbox', { name: '第 1 組次數' })).toHaveValue('12')
    expect(within(reloaded).getByRole('textbox', { name: '第 1 組額外負重（kg）' })).toHaveValue('')
  })
})
