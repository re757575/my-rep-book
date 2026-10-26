import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

/** 設定頁的生日欄位 */
function birthDateField() {
  return screen.findByLabelText('生日')
}

describe('生日', () => {
  it('選了生日就儲存，旁邊顯示目前的年齡；重新整理後仍保留', async () => {
    const { user, reload } = renderApp('/settings')
    await user.type(await birthDateField(), '1990-05-20')

    // 今天固定為 2026-10-24
    expect(await screen.findByText('36 歲')).toBeInTheDocument()
    expect(screen.getByText('用於 AI 提示詞，只會帶入年齡')).toBeInTheDocument()

    reload()
    expect(await birthDateField()).toHaveValue('1990-05-20')
    expect(await screen.findByText('36 歲')).toBeInTheDocument()
  })

  it('晚於今天時顯示錯誤且不寫入', async () => {
    const { user, reload } = renderApp('/settings')
    const field = await birthDateField()
    await user.type(field, '2026-10-25')

    expect(field).toBeInvalid()
    expect(field).toHaveAccessibleDescription('不可晚於今天')
    expect(screen.queryByText(/ 歲$/)).not.toBeInTheDocument()

    reload()
    expect(await birthDateField()).toHaveValue('')
  })

  it('清空即改回尚未填寫', async () => {
    const { user, reload } = renderApp('/settings')
    await user.type(await birthDateField(), '1990-05-20')
    await screen.findByText('36 歲')

    await user.clear(await birthDateField())
    await waitFor(() => expect(screen.queryByText('36 歲')).not.toBeInTheDocument())

    reload()
    expect(await birthDateField()).toHaveValue('')
  })
})
