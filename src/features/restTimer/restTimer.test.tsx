import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FIXED_TODAY } from '@/test/fixedToday'
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

/** 底部分頁上方的倒數列 */
function restBar() {
  return screen.findByRole('region', { name: '組間休息' })
}

async function goToTab(user: UserEvent, tab: '今天' | '歷史' | '動作庫' | '設定') {
  const tabs = screen.getByRole('navigation', { name: '主要分頁' })
  await user.click(within(tabs).getByRole('link', { name: tab }))
}

describe('組間休息計時器', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'vibrate')
  })

  it('新增一組後開始倒數，預設 1:30；沒新增之前沒有倒數列', async () => {
    const { user } = renderApp()
    const card = await addExercise(user, '槓鈴臥推')
    expect(screen.queryByRole('region', { name: '組間休息' })).not.toBeInTheDocument()

    await user.click(within(card).getByRole('button', { name: '新增一組' }))

    expect(within(await restBar()).getByRole('timer')).toHaveTextContent('1:30')
  })

  it('填完一組（補上最後一個必填欄位）後開始倒數；改已經完整的組不會', async () => {
    const { user } = renderApp()
    const card = await addExercise(user, '槓鈴臥推')

    await user.type(within(card).getByRole('textbox', { name: '第 1 組重量（kg）' }), '60')
    expect(screen.queryByRole('region', { name: '組間休息' })).not.toBeInTheDocument()
    await user.type(within(card).getByRole('textbox', { name: '第 1 組次數' }), '8')
    const bar = await restBar()
    expect(within(bar).getByRole('timer')).toHaveTextContent('1:30')

    await user.click(within(bar).getByRole('button', { name: '略過' }))
    expect(screen.queryByRole('region', { name: '組間休息' })).not.toBeInTheDocument()
    await user.type(within(card).getByRole('textbox', { name: '第 1 組次數' }), '9')
    expect(screen.queryByRole('region', { name: '組間休息' })).not.toBeInTheDocument()
  })

  it('補記過去的日期不會開始倒數', async () => {
    const { user } = renderApp('/day/2026-10-20')
    const card = await addExercise(user, '槓鈴臥推')

    await user.click(within(card).getByRole('button', { name: '新增一組' }))
    await user.type(within(card).getByRole('textbox', { name: '第 1 組重量（kg）' }), '60')
    await user.type(within(card).getByRole('textbox', { name: '第 1 組次數' }), '8')

    await screen.findByRole('textbox', { name: '第 2 組次數' })
    expect(screen.queryByRole('region', { name: '組間休息' })).not.toBeInTheDocument()
  })

  it('±15 秒調整剩餘時間；切到其他分頁與重新整理後仍看得到', async () => {
    const { user, reload } = renderApp()
    const card = await addExercise(user, '槓鈴臥推')
    await user.click(within(card).getByRole('button', { name: '新增一組' }))
    const bar = await restBar()

    await user.click(within(bar).getByRole('button', { name: '＋15 秒' }))
    expect(within(bar).getByRole('timer')).toHaveTextContent('1:45')
    await user.click(within(bar).getByRole('button', { name: '−15 秒' }))
    await user.click(within(bar).getByRole('button', { name: '−15 秒' }))
    expect(within(bar).getByRole('timer')).toHaveTextContent('1:15')

    await goToTab(user, '歷史')
    expect(within(await restBar()).getByRole('timer')).toHaveTextContent('1:15')

    reload()
    expect(within(await restBar()).getByRole('timer')).toHaveTextContent('1:15')
  })

  it('時間到：顯示「休息結束」並震動一次，關閉後消失', async () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    const { user } = renderApp()
    const card = await addExercise(user, '槓鈴臥推')
    await user.click(within(card).getByRole('button', { name: '新增一組' }))
    await restBar()

    vi.setSystemTime(FIXED_TODAY.getTime() + 90_000)

    const bar = await restBar()
    await waitFor(() => expect(within(bar).getByRole('status')).toHaveTextContent('休息結束'))
    expect(vibrate).toHaveBeenCalledTimes(1)

    vi.setSystemTime(FIXED_TODAY.getTime() + 91_000)
    await user.click(within(bar).getByRole('button', { name: '關閉' }))
    expect(screen.queryByRole('region', { name: '組間休息' })).not.toBeInTheDocument()
    expect(vibrate).toHaveBeenCalledTimes(1)
  })

  it('震動關閉時，時間到不震動', async () => {
    const vibrate = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    const { user } = renderApp('/settings')
    await user.click(await screen.findByRole('switch', { name: '時間到時震動' }))
    await goToTab(user, '今天')
    const card = await addExercise(user, '槓鈴臥推')
    await user.click(within(card).getByRole('button', { name: '新增一組' }))
    await restBar()

    vi.setSystemTime(FIXED_TODAY.getTime() + 90_000)

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('休息結束'))
    expect(vibrate).not.toHaveBeenCalled()
  })

  it('設定頁可以關閉自動倒數，也可以改休息時間', async () => {
    const { user } = renderApp('/settings')
    const group = await screen.findByRole('radiogroup', { name: '休息時間' })
    await user.click(within(group).getByRole('radio', { name: '1 分' }))
    await waitFor(() => expect(within(group).getByRole('radio', { name: '1 分' })).toBeChecked())

    await goToTab(user, '今天')
    const card = await addExercise(user, '槓鈴臥推')
    await user.click(within(card).getByRole('button', { name: '新增一組' }))
    const bar = await restBar()
    expect(within(bar).getByRole('timer')).toHaveTextContent('1:00')
    await user.click(within(bar).getByRole('button', { name: '略過' }))

    await goToTab(user, '設定')
    const enabled = await screen.findByRole('switch', { name: '新增一組或填完一組後自動倒數' })
    await user.click(enabled)
    await waitFor(() => expect(enabled).not.toBeChecked())
    await goToTab(user, '今天')
    await user.click(
      within(await screen.findByRole('region', { name: '槓鈴臥推' })).getByRole('button', {
        name: '新增一組',
      }),
    )
    await screen.findByRole('textbox', { name: '第 3 組次數' })
    expect(screen.queryByRole('region', { name: '組間休息' })).not.toBeInTheDocument()
  })
})
