import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

describe('App 外殼', () => {
  it('打開 App 預設顯示今天頁', () => {
    renderApp()

    expect(screen.getByRole('heading', { level: 1, name: '今天' })).toBeInTheDocument()
  })

  it('點底部分頁可以切換頁面', async () => {
    const { user } = renderApp()
    const tabs = screen.getByRole('navigation', { name: '主要分頁' })

    for (const name of ['歷史', '動作庫', '設定', '今天']) {
      await user.click(within(tabs).getByRole('link', { name }))

      expect(screen.getByRole('heading', { level: 1, name })).toBeInTheDocument()
      expect(within(tabs).getByRole('link', { name })).toHaveAttribute('aria-current', 'page')
    }
  })

  it('直接開啟深層連結會顯示對應的頁面', () => {
    renderApp('/settings')

    expect(screen.getByRole('heading', { level: 1, name: '設定' })).toBeInTheDocument()
  })
})
