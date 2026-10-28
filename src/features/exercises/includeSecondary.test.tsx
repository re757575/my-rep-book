import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

const SWITCH = { name: '包含次要部位' }

/** 清單中每一列的文字（以中文名開頭），依顯示順序 */
function rowNames(list: HTMLElement) {
  return within(list)
    .getAllByRole('listitem')
    .map((item) => item.textContent ?? '')
}

function indexOfRow(names: string[], name: string) {
  return names.findIndex((text) => text.startsWith(name))
}

async function openPicker(user: UserEvent) {
  await user.click(await screen.findByRole('button', { name: '加入動作' }))
  const dialog = await screen.findByRole('dialog', { name: '加入動作' })
  await within(dialog).findByRole('list', { name: '動作清單' })
  return dialog
}

describe('動作庫分頁：包含次要部位（US-49）', () => {
  it('選「全部」時沒有「包含次要部位」開關，選了分類才出現，預設關閉', async () => {
    const { user } = renderApp('/exercises')
    await screen.findByRole('radio', { name: '全部' })
    expect(screen.queryByRole('switch', SWITCH)).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: '手臂：三頭' }))

    expect(screen.getByRole('switch', SWITCH)).not.toBeChecked()

    await user.click(screen.getByRole('radio', { name: '全部' }))
    expect(screen.queryByRole('switch', SWITCH)).not.toBeInTheDocument()
  })

  it('關閉時只列主要部位是三頭的動作；開啟後多出把三頭當次要部位的臥推，並排在後面', async () => {
    const { user } = renderApp('/exercises')
    await user.click(await screen.findByRole('radio', { name: '手臂：三頭' }))
    const list = await screen.findByRole('list', { name: '動作清單' })
    expect(within(list).queryByText('槓鈴臥推')).not.toBeInTheDocument()
    const primaryCount = within(list).getAllByRole('listitem').length

    await user.click(screen.getByRole('switch', SWITCH))

    expect(screen.getByRole('switch', SWITCH)).toBeChecked()
    const names = rowNames(await screen.findByRole('list', { name: '動作清單' }))
    expect(names.length).toBeGreaterThan(primaryCount)
    expect(indexOfRow(names, '槓鈴臥推')).toBeGreaterThanOrEqual(primaryCount)
    expect(indexOfRow(names, '窄握臥推')).toBeLessThan(primaryCount)

    await user.click(screen.getByRole('switch', SWITCH))
    expect(
      within(await screen.findByRole('list', { name: '動作清單' })).getAllByRole('listitem'),
    ).toHaveLength(primaryCount)
  })

  it('與搜尋同時作用：搜尋「bench」＋三頭，開啟後依序是窄握臥推、椅上撐體、槓鈴臥推、啞鈴臥推', async () => {
    const { user } = renderApp('/exercises')
    await user.type(await screen.findByRole('searchbox', { name: '搜尋動作' }), 'bench')
    await user.click(screen.getByRole('radio', { name: '手臂：三頭' }))
    await user.click(screen.getByRole('switch', SWITCH))

    const names = rowNames(await screen.findByRole('list', { name: '動作清單' }))
    expect(
      names.map((text) =>
        ['窄握臥推', '椅上撐體', '槓鈴臥推', '啞鈴臥推'].find((n) => text.startsWith(n)),
      ),
    ).toEqual(['窄握臥推', '椅上撐體', '槓鈴臥推', '啞鈴臥推'])
  })

  it('切回「全部」再選別的分類，開關維持開啟', async () => {
    const { user } = renderApp('/exercises')
    await user.click(await screen.findByRole('radio', { name: '胸' }))
    await user.click(screen.getByRole('switch', SWITCH))

    await user.click(screen.getByRole('radio', { name: '全部' }))
    await user.click(screen.getByRole('radio', { name: '肩' }))

    expect(screen.getByRole('switch', SWITCH)).toBeChecked()
  })

  it('離開動作庫再回來，開關回到關閉', async () => {
    const { user } = renderApp('/exercises')
    await user.click(await screen.findByRole('radio', { name: '胸' }))
    await user.click(screen.getByRole('switch', SWITCH))

    const nav = screen.getByRole('navigation', { name: '主要分頁' })
    await user.click(within(nav).getByRole('link', { name: '歷史' }))
    await user.click(within(nav).getByRole('link', { name: '動作庫' }))
    await user.click(await screen.findByRole('radio', { name: '胸' }))

    expect(screen.getByRole('switch', SWITCH)).not.toBeChecked()
  })
})

describe('加入動作選單：包含次要部位（US-49）', () => {
  it('開啟後列出次要部位屬於該分類的動作，點選後加入訓練', async () => {
    const { user } = renderApp()
    const dialog = await openPicker(user)
    await user.click(within(dialog).getByRole('radio', { name: '手臂：三頭' }))
    expect(
      within(within(dialog).getByRole('list', { name: '動作清單' })).queryByText('槓鈴臥推'),
    ).not.toBeInTheDocument()

    await user.click(within(dialog).getByRole('switch', SWITCH))

    const list = await within(dialog).findByRole('list', { name: '動作清單' })
    await user.click(await within(list).findByRole('button', { name: /^槓鈴臥推/ }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByRole('region', { name: '槓鈴臥推' })).toBeInTheDocument()
  })

  it('選「全部」時沒有開關；關閉選單再開啟，開關回到關閉', async () => {
    const { user } = renderApp()
    let dialog = await openPicker(user)
    expect(within(dialog).queryByRole('switch', SWITCH)).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('radio', { name: '手臂：三頭' }))
    await user.click(within(dialog).getByRole('switch', SWITCH))

    await user.keyboard('{Escape}')
    dialog = await openPicker(user)
    await user.click(within(dialog).getByRole('radio', { name: '手臂：三頭' }))

    expect(within(dialog).getByRole('switch', SWITCH)).not.toBeChecked()
  })

  it('已隱藏的預設動作在開啟後仍不出現', async () => {
    const { user } = renderApp('/exercises')
    await user.click(await screen.findByRole('link', { name: /^槓鈴臥推/ }))
    await user.click(await screen.findByRole('button', { name: '隱藏' }))
    const nav = screen.getByRole('navigation', { name: '主要分頁' })
    await user.click(within(nav).getByRole('link', { name: '今天' }))

    const dialog = await openPicker(user)
    await user.click(within(dialog).getByRole('radio', { name: '手臂：三頭' }))
    await user.click(within(dialog).getByRole('switch', SWITCH))

    const list = await within(dialog).findByRole('list', { name: '動作清單' })
    expect(within(list).getByText('窄握臥推')).toBeInTheDocument()
    expect(within(list).queryByText('槓鈴臥推')).not.toBeInTheDocument()
  })
})
