import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

describe('關於（US-43）', () => {
  it('設定頁最下方顯示目前的 App 版本號', async () => {
    renderApp('/settings')

    const about = await screen.findByRole('region', { name: '關於' })
    const version = within(about).getByRole('definition', { name: '版本' })
    // 建置時由 vite.config.ts 從 package.json 的 version 注入
    expect(version.textContent).toBe(`v${__APP_VERSION__}`)
    expect(__APP_VERSION__).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('在持久儲存之後，是設定頁的最後一個區塊', async () => {
    renderApp('/settings')

    await screen.findByRole('region', { name: '關於' })
    const headings = screen
      .getAllByRole('heading', { level: 2 })
      .map((heading) => heading.textContent)
    expect(headings.at(-2)).toBe('持久儲存')
    expect(headings.at(-1)).toBe('關於')
  })
})
