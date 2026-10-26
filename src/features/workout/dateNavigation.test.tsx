import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'
import { unlockDay } from '@/test/unlockDay'

/** 從加入動作選單加入一個動作，回傳該訓練動作的區塊 */
async function addExercise(user: UserEvent, name: string) {
  // 非今天的訓練頁預設鎖定，鎖定時沒有「加入動作」
  await unlockDay(user)
  await user.click(screen.getByRole('button', { name: '加入動作' }))
  const dialog = await screen.findByRole('dialog', { name: '加入動作' })
  await user.click(await within(dialog).findByRole('button', { name: new RegExp(`^${name}`) }))
  return screen.findByRole('region', { name })
}

const dateHeading = (name: string) => screen.findByRole('heading', { level: 1, name })

describe('日期切換與補記', () => {
  it('切到昨天補記一筆，重新整理後仍在，今天則沒有這筆', async () => {
    const { user, reload } = renderApp()

    await user.click(screen.getByRole('button', { name: '前一天' }))
    expect(await dateHeading('10/23（五）')).toBeInTheDocument()
    const card = await addExercise(user, '槓鈴臥推')
    await user.type(within(card).getByRole('textbox', { name: '第 1 組重量（kg）' }), '60')
    await user.type(within(card).getByRole('textbox', { name: '第 1 組次數' }), '8')

    reload()

    expect(await dateHeading('10/23（五）')).toBeInTheDocument()
    const reloaded = await screen.findByRole('region', { name: '槓鈴臥推' })
    expect(within(reloaded).getByRole('textbox', { name: '第 1 組重量（kg）' })).toHaveValue('60')
    expect(within(reloaded).getByRole('textbox', { name: '第 1 組次數' })).toHaveValue('8')

    await user.click(screen.getByRole('button', { name: '後一天' }))
    expect(await dateHeading('10/24（六）')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '槓鈴臥推' })).not.toBeInTheDocument()
  })

  it('檢視今天時「後一天」停用，也沒有「回到今天」', () => {
    renderApp()

    expect(screen.getByRole('button', { name: '後一天' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: '回到今天' })).not.toBeInTheDocument()
  })

  it('檢視其他日期時顯示「回到今天」，按下後回到今天', async () => {
    const { user } = renderApp('/day/2026-10-20')
    expect(await dateHeading('10/20（二）')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '後一天' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: '回到今天' }))

    expect(await dateHeading('10/24（六）')).toBeInTheDocument()
    expect(window.location.pathname).toBe(import.meta.env.BASE_URL)
    expect(screen.queryByRole('button', { name: '回到今天' })).not.toBeInTheDocument()
  })

  it('日期選擇器以週一為一週第一天，未來日期不能選，選過去的日期後跳到該日', async () => {
    const { user } = renderApp()

    await user.click(screen.getByRole('button', { name: '選擇日期' }))
    const picker = await screen.findByRole('dialog', { name: '選擇日期' })
    // 星期標題列對輔助科技隱藏，改看每一週第一天的日期按鈕
    for (const week of within(picker).getAllByRole('row')) {
      expect(within(week).getAllByRole('button')[0]).toHaveAccessibleName(/星期一/)
    }
    expect(within(picker).getByRole('button', { name: /10月25日/ })).toBeDisabled()
    expect(within(picker).getByRole('button', { name: /10月24日/ })).toBeEnabled()

    await user.click(within(picker).getByRole('button', { name: /10月20日/ }))

    expect(await dateHeading('10/20（二）')).toBeInTheDocument()
    expect(window.location.pathname).toBe(`${import.meta.env.BASE_URL}day/2026-10-20`)
    expect(screen.queryByRole('dialog', { name: '選擇日期' })).not.toBeInTheDocument()
  })

  it('檢視其他日期時，底部分頁仍選取「今天」', async () => {
    renderApp('/day/2026-10-20')
    expect(await dateHeading('10/20（二）')).toBeInTheDocument()

    const tabs = screen.getByRole('navigation', { name: '主要分頁' })
    expect(within(tabs).getByRole('link', { name: '今天' })).toHaveAttribute('aria-current', 'page')
    expect(within(tabs).getByRole('link', { name: '歷史' })).not.toHaveAttribute('aria-current')
  })

  it('從網址進入未來日期時，被導回今天並顯示「無法記錄未來的日期」', async () => {
    renderApp('/day/2026-10-25')

    expect(await dateHeading('10/24（六）')).toBeInTheDocument()
    expect(window.location.pathname).toBe(import.meta.env.BASE_URL)
    expect(await screen.findByText('無法記錄未來的日期')).toBeInTheDocument()
  })
})
