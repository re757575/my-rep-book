import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

function exerciseList() {
  return screen.getByRole('list', { name: '動作清單' })
}

describe('動作庫分頁：預設動作庫', () => {
  it('搜尋「bench」時，出現槓鈴臥推、啞鈴臥推、窄握臥推', async () => {
    const { user } = renderApp('/exercises')

    await user.type(screen.getByRole('searchbox', { name: '搜尋動作' }), 'bench')

    const list = exerciseList()
    expect(within(list).getByText('槓鈴臥推')).toBeInTheDocument()
    expect(within(list).getByText('啞鈴臥推')).toBeInTheDocument()
    expect(within(list).getByText('窄握臥推')).toBeInTheDocument()
    expect(within(list).queryByText('槓鈴深蹲')).not.toBeInTheDocument()
  })

  it('選「肩」分類時，出現聳肩', async () => {
    const { user } = renderApp('/exercises')

    await user.click(screen.getByRole('radio', { name: '肩' }))

    expect(screen.getByRole('radio', { name: '肩' })).toBeChecked()
    const list = exerciseList()
    expect(within(list).getByText('聳肩')).toBeInTheDocument()
    expect(within(list).queryByText('槓鈴臥推')).not.toBeInTheDocument()
  })

  it('選「腿：股四頭／臀」時，出現槓鈴深蹲', async () => {
    const { user } = renderApp('/exercises')

    await user.click(screen.getByRole('radio', { name: '腿：股四頭／臀' }))

    const list = exerciseList()
    expect(within(list).getByText('槓鈴深蹲')).toBeInTheDocument()
    expect(within(list).getByText('臀推')).toBeInTheDocument()
    expect(within(list).queryByText('聳肩')).not.toBeInTheDocument()
  })

  it('分類與搜尋可以同時套用，選「全部」會回到全部動作', async () => {
    const { user } = renderApp('/exercises')

    await user.type(screen.getByRole('searchbox', { name: '搜尋動作' }), 'bench')
    await user.click(screen.getByRole('radio', { name: '手臂：三頭' }))

    expect(within(exerciseList()).getAllByRole('listitem')).toHaveLength(2)
    expect(within(exerciseList()).getByText('窄握臥推')).toBeInTheDocument()
    expect(within(exerciseList()).getByText('椅上撐體')).toBeInTheDocument()

    await user.clear(screen.getByRole('searchbox', { name: '搜尋動作' }))
    await user.click(screen.getByRole('radio', { name: '全部' }))

    expect(screen.getByRole('radio', { name: '全部' })).toBeChecked()
    expect(within(exerciseList()).getAllByRole('listitem')).toHaveLength(66)
  })

  it('沒有符合的動作時顯示提示', async () => {
    const { user } = renderApp('/exercises')

    await user.type(screen.getByRole('searchbox', { name: '搜尋動作' }), '不存在的動作')

    expect(screen.queryByRole('list', { name: '動作清單' })).not.toBeInTheDocument()
    expect(screen.getByText('找不到符合的動作')).toBeInTheDocument()
  })

  it('由上到下是搜尋框、分類列、動作清單；每一列顯示中文名、英文名和器材', () => {
    renderApp('/exercises')

    const search = screen.getByRole('searchbox', { name: '搜尋動作' })
    const categories = screen.getByRole('radiogroup', { name: '篩選分類' })
    const list = exerciseList()
    expect(search.compareDocumentPosition(categories)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(categories.compareDocumentPosition(list)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)

    expect(
      within(categories)
        .getAllByRole('radio')
        .map((radio) => radio.textContent),
    ).toEqual([
      '全部',
      '胸',
      '背',
      '肩',
      '手臂：二頭',
      '手臂：三頭',
      '腿：股四頭／臀',
      '腿：腿後側',
      '小腿',
      '核心／腹部',
      '有氧／全身',
    ])
    expect(screen.getByRole('radio', { name: '全部' })).toBeChecked()

    const items = within(list).getAllByRole('listitem')
    expect(items).toHaveLength(66)
    expect(items[0]).toHaveTextContent('槓鈴臥推')
    expect(items[0]).toHaveTextContent('Barbell Bench Press')
    expect(items[0]).toHaveTextContent('槓鈴')
    const plank = items.find((item) => within(item).queryByText('平板支撐'))
    expect(plank).toHaveTextContent('Plank')
    expect(plank).toHaveTextContent('徒手')
  })
})
