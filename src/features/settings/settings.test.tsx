import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'
import { unlockDay } from '@/test/unlockDay'

/** 點底部的分頁 */
async function goToTab(user: UserEvent, tab: '今天' | '歷史' | '動作庫' | '設定') {
  const tabs = screen.getByRole('navigation', { name: '主要分頁' })
  await user.click(within(tabs).getByRole('link', { name: tab }))
}

/** 在設定頁選擇重量單位，等它儲存完成 */
async function chooseWeightUnit(user: UserEvent, unit: 'kg' | 'lb') {
  await goToTab(user, '設定')
  const group = await settingGroup('重量單位')
  const option = await within(group).findByRole('radio', { name: unit })
  await user.click(option)
  await waitFor(() => expect(option).toBeChecked())
}

/** 訓練頁上的訓練動作數（每個訓練動作的標題是 h2） */
function workoutExerciseCount() {
  return screen.queryAllByRole('heading', { level: 2 }).length
}

/**
 * 從加入動作選單的全部動作清單加入一個動作，回傳該訓練動作的區塊。
 * 做過的動作也會出現在「最近使用」，所以從「動作清單」裡選。
 */
async function addExercise(user: UserEvent, name: string) {
  // 非今天的訓練頁預設鎖定，鎖定時沒有「加入動作」
  await unlockDay(user)
  const countBefore = workoutExerciseCount()
  await user.click(await screen.findByRole('button', { name: '加入動作' }))
  const dialog = await screen.findByRole('dialog', { name: '加入動作' })
  const list = await within(dialog).findByRole('list', { name: '動作清單' })
  await user.click(within(list).getByRole('button', { name: new RegExp(`^${name}`) }))
  await waitFor(() => expect(workoutExerciseCount()).toBe(countBefore + 1))
  return screen.getByRole('region', { name })
}

/** 某一組在日明細或動作歷史中的顯示文字，依順序 */
function setTexts(container: HTMLElement) {
  return within(within(container).getByRole('list', { name: '組' }))
    .getAllByRole('listitem')
    .map((item) => item.textContent)
}

/** 每日摘要的總訓練量 */
async function summaryVolume(container: HTMLElement = document.body) {
  const summary = await within(container).findByRole('region', { name: '每日摘要' })
  return within(summary).getByRole('definition', { name: '總訓練量' }).textContent
}

/** 以 kg 在 10/20 記錄槓鈴臥推 60kg×8 與引體向上 8 下＋10kg，再切到 lb */
async function recordInKgThenSwitchToLb() {
  const { user } = renderApp('/day/2026-10-20')
  const bench = await addExercise(user, '槓鈴臥推')
  await user.type(within(bench).getByRole('textbox', { name: '第 1 組重量（kg）' }), '60')
  await user.type(within(bench).getByRole('textbox', { name: '第 1 組次數' }), '8')
  const pullUp = await addExercise(user, '引體向上')
  await user.type(within(pullUp).getByRole('textbox', { name: '第 1 組次數' }), '8')
  await user.type(within(pullUp).getByRole('textbox', { name: '第 1 組額外負重（kg）' }), '10')
  await waitFor(async () => expect(await summaryVolume()).toBe('480 kg'))

  await chooseWeightUnit(user, 'lb')
  return user
}

/** 設定頁上某個設定的選項群組，例如「重量單位」 */
function settingGroup(name: string) {
  return screen.findByRole('radiogroup', { name })
}

describe('設定頁', () => {
  it('預設重量單位為 kg、主題跟隨系統；選擇後重新整理仍保留', async () => {
    const { user, reload } = renderApp('/settings')

    const unit = await settingGroup('重量單位')
    const theme = await settingGroup('主題')
    await waitFor(() => expect(within(unit).getByRole('radio', { name: 'kg' })).toBeChecked())
    expect(within(theme).getByRole('radio', { name: '跟隨系統' })).toBeChecked()

    await user.click(within(unit).getByRole('radio', { name: 'lb' }))
    await user.click(within(theme).getByRole('radio', { name: '深色' }))
    await waitFor(() => expect(within(theme).getByRole('radio', { name: '深色' })).toBeChecked())
    expect(within(unit).getByRole('radio', { name: 'lb' })).toBeChecked()

    reload()

    const unitAfter = await settingGroup('重量單位')
    await waitFor(() => expect(within(unitAfter).getByRole('radio', { name: 'lb' })).toBeChecked())
    const themeAfter = await settingGroup('主題')
    expect(within(themeAfter).getByRole('radio', { name: '深色' })).toBeChecked()
  })
})

describe('重量單位', () => {
  it('在 lb 模式輸入 135 lb，切回 kg 顯示換算值；再切回 lb 仍顯示 135.0', async () => {
    const { user } = renderApp()

    await chooseWeightUnit(user, 'lb')
    await goToTab(user, '今天')
    const bench = await addExercise(user, '槓鈴臥推')
    await user.type(within(bench).getByRole('textbox', { name: '第 1 組重量（lb）' }), '135')
    await user.type(within(bench).getByRole('textbox', { name: '第 1 組次數' }), '8')

    await chooseWeightUnit(user, 'kg')
    await goToTab(user, '今天')
    expect(await screen.findByRole('textbox', { name: '第 1 組重量（kg）' })).toHaveValue('61.23')

    await chooseWeightUnit(user, 'lb')
    await goToTab(user, '今天')
    expect(await screen.findByRole('textbox', { name: '第 1 組重量（lb）' })).toHaveValue('135.0')
  })

  it('lb 模式下，訓練頁的上次紀錄、預填的第一組與每日摘要都以 lb 顯示', async () => {
    const user = await recordInKgThenSwitchToLb()

    await goToTab(user, '今天')
    await screen.findByRole('heading', { level: 1, name: '10/24（六）' })
    const bench = await addExercise(user, '槓鈴臥推')

    expect(await within(bench).findByText('上次（10/20）：132.3lb×8')).toBeInTheDocument()
    expect(within(bench).getByRole('textbox', { name: '第 1 組重量（lb）' })).toHaveValue('132.3')
    await waitFor(async () => expect(await summaryVolume()).toBe('1,058.2 lb'))
  })

  it('lb 模式下，歷史的日明細與動作歷史都以 lb 顯示', async () => {
    const user = await recordInKgThenSwitchToLb()

    await goToTab(user, '歷史')
    const grid = await screen.findByRole('grid')
    await user.click(within(grid).getByRole('button', { name: /10月20日/ }))
    const detail = await screen.findByRole('region', { name: '10/20（二）' })
    await waitFor(async () => expect(await summaryVolume(detail)).toBe('1,058.2 lb'))
    expect(setTexts(within(detail).getByRole('article', { name: '槓鈴臥推' }))).toEqual([
      '132.3lb×8',
    ])
    expect(setTexts(within(detail).getByRole('article', { name: '引體向上' }))).toEqual([
      '8下＋22.0lb',
    ])

    await goToTab(user, '動作庫')
    await user.click(await screen.findByRole('link', { name: /^槓鈴臥推/ }))
    const entry = await screen.findByRole('article', { name: '2026/10/20（二）' })
    expect(setTexts(entry)).toEqual(['132.3lb×8'])
  })
})

describe('主題', () => {
  const isDark = () => document.documentElement.classList.contains('dark')

  it('選擇深色後立即套用，重新整理後仍有效；改選淺色後取消深色', async () => {
    const { user, reload } = renderApp('/settings')
    const theme = await settingGroup('主題')
    await within(theme).findByRole('radio', { name: '跟隨系統', checked: true })
    expect(isDark()).toBe(false)

    await user.click(within(theme).getByRole('radio', { name: '深色' }))
    await waitFor(() => expect(isDark()).toBe(true))

    const { user: userAfter } = reload()
    // 重新整理時先以預設值（跟隨系統，測試環境為淺色）渲染，讀到儲存的設定後才套用深色
    await waitFor(() => expect(isDark()).toBe(true))
    const themeAfter = await settingGroup('主題')
    await userAfter.click(within(themeAfter).getByRole('radio', { name: '淺色' }))
    await waitFor(() => expect(isDark()).toBe(false))
  })
})
