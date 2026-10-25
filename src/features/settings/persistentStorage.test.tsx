import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { fakeStorageManager } from '@/test/fakeStorageManager'
import { renderApp } from '@/test/renderApp'

const NOT_PERSISTED = '未啟用，瀏覽器可能在空間不足時清除資料，建議定期匯出'

/** 設定頁的「持久儲存」區塊 */
function persistentStorageSection() {
  return screen.findByRole('region', { name: '持久儲存' })
}

describe('持久儲存', () => {
  it('首次啟動時向瀏覽器申請持久儲存；瀏覽器同意時，設定頁顯示「已啟用」', async () => {
    fakeStorageManager({ grantsPersistence: true })
    const { user } = renderApp()

    await screen.findByRole('heading', { level: 1, name: '10/24（六）' })
    const tabs = screen.getByRole('navigation', { name: '主要分頁' })
    await user.click(within(tabs).getByRole('link', { name: '設定' }))

    expect(await within(await persistentStorageSection()).findByText('已啟用')).toBeInTheDocument()
  })

  it('之前已經同意過持久儲存時，設定頁顯示「已啟用」', async () => {
    fakeStorageManager({ grantsPersistence: false, persisted: true })
    renderApp('/settings')

    expect(await within(await persistentStorageSection()).findByText('已啟用')).toBeInTheDocument()
  })

  it('瀏覽器不同意持久儲存時，設定頁顯示未啟用與定期匯出的建議', async () => {
    fakeStorageManager({ grantsPersistence: false })
    renderApp('/settings')

    expect(
      await within(await persistentStorageSection()).findByText(NOT_PERSISTED),
    ).toBeInTheDocument()
  })

  it('瀏覽器不支援持久儲存時，設定頁顯示未啟用與定期匯出的建議', async () => {
    renderApp('/settings')

    expect(
      await within(await persistentStorageSection()).findByText(NOT_PERSISTED),
    ).toBeInTheDocument()
  })
})
