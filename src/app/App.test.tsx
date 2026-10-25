import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

/** 各分頁的頁面標題；今天頁的標題是今天的日期 */
const TAB_HEADINGS = [
  ['歷史', '歷史'],
  ['動作庫', '動作庫'],
  ['設定', '設定'],
  ['今天', '10/24（六）'],
] as const

describe('App 外殼', () => {
  it('打開 App 預設顯示今天頁', () => {
    renderApp()

    expect(screen.getByRole('heading', { level: 1, name: '10/24（六）' })).toBeInTheDocument()
  })

  it('點底部分頁可以切換頁面', async () => {
    const { user } = renderApp()
    const tabs = screen.getByRole('navigation', { name: '主要分頁' })

    for (const [tab, heading] of TAB_HEADINGS) {
      await user.click(within(tabs).getByRole('link', { name: tab }))

      // 今天以外的分頁在第一次進入時才載入（code splitting），要等頁面出現
      expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
      expect(within(tabs).getByRole('link', { name: tab })).toHaveAttribute('aria-current', 'page')
    }
  })

  it('直接開啟深層連結會顯示對應的頁面', async () => {
    renderApp('/settings')

    expect(await screen.findByRole('heading', { level: 1, name: '設定' })).toBeInTheDocument()
  })
})
