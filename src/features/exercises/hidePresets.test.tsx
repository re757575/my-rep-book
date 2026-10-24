import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

async function exerciseList() {
  return screen.findByRole('list', { name: '動作清單' })
}

/** 從動作庫點進動作詳情後按「隱藏」，再回到動作庫 */
async function hideFromLibrary(user: UserEvent, name: string) {
  await user.click(within(await exerciseList()).getByRole('link', { name: new RegExp(name) }))
  await user.click(await screen.findByRole('button', { name: '隱藏' }))
  expect(await screen.findByText('已隱藏')).toBeInTheDocument()
  await user.click(screen.getByRole('link', { name: '返回動作庫' }))
}

describe('隱藏預設動作', () => {
  it('隱藏後，該動作從動作庫清單消失', async () => {
    const { user } = renderApp('/exercises')

    await hideFromLibrary(user, '槓鈴臥推')

    const list = await exerciseList()
    expect(within(list).queryByText('槓鈴臥推')).not.toBeInTheDocument()
    expect(within(list).getByText('啞鈴臥推')).toBeInTheDocument()
    expect(within(list).getAllByRole('listitem')).toHaveLength(65)
  })

  it('重新整理頁面後，隱藏狀態仍保留', async () => {
    const { user, reload } = renderApp('/exercises')
    await hideFromLibrary(user, '聳肩')

    reload()

    const list = await exerciseList()
    expect(within(list).getAllByRole('listitem')).toHaveLength(65)
    expect(within(list).queryByText('聳肩')).not.toBeInTheDocument()
  })

  it('打開「顯示已隱藏／已封存」後看得到已隱藏的動作，並可以取消隱藏', async () => {
    const { user } = renderApp('/exercises')
    await hideFromLibrary(user, '槓鈴臥推')

    const toggle = screen.getByRole('switch', { name: '顯示已隱藏／已封存' })
    expect(toggle).not.toBeChecked()
    await user.click(toggle)
    expect(toggle).toBeChecked()

    const hiddenRow = within(await exerciseList()).getByRole('link', { name: /槓鈴臥推/ })
    expect(hiddenRow).toHaveTextContent('已隱藏')
    expect(within(await exerciseList()).getAllByRole('listitem')).toHaveLength(66)

    await user.click(hiddenRow)
    await user.click(await screen.findByRole('button', { name: '取消隱藏' }))
    expect(await screen.findByRole('button', { name: '隱藏' })).toBeInTheDocument()
    expect(screen.queryByText('已隱藏')).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: '返回動作庫' }))
    const list = await exerciseList()
    expect(within(list).getByRole('link', { name: /槓鈴臥推/ })).not.toHaveTextContent('已隱藏')
    expect(within(list).getAllByRole('listitem')).toHaveLength(66)
  })
})
