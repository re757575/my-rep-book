import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

function detail(label: string) {
  return screen.getByRole('definition', { name: label })
}

describe('動作詳情', () => {
  it('從動作庫點動作，看到中文名、英文名、主要部位、次要部位、器材、記錄類型', async () => {
    const { user } = renderApp('/exercises')

    const list = await screen.findByRole('list', { name: '動作清單' })
    await user.click(within(list).getByRole('link', { name: /槓鈴臥推/ }))

    expect(await screen.findByRole('heading', { name: '槓鈴臥推' })).toBeInTheDocument()
    expect(detail('英文名稱')).toHaveTextContent('Barbell Bench Press')
    expect(detail('主要部位')).toHaveTextContent('胸')
    expect(detail('次要部位')).toHaveTextContent('三頭、肩')
    expect(detail('器材')).toHaveTextContent('槓鈴')
    expect(detail('記錄類型')).toHaveTextContent('重量×次數')
  })

  it('預設動作只有「隱藏」，沒有編輯或刪除', async () => {
    renderApp('/exercises/plank')

    expect(await screen.findByRole('heading', { name: '平板支撐' })).toBeInTheDocument()
    expect(detail('記錄類型')).toHaveTextContent('時間')
    expect(screen.getByRole('button', { name: '隱藏' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /編輯/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /刪除/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /編輯/ })).not.toBeInTheDocument()
  })

  it('沒有次要部位時顯示「無」', async () => {
    renderApp('/exercises/treadmill')

    expect(await screen.findByRole('heading', { name: '跑步機' })).toBeInTheDocument()
    expect(detail('次要部位')).toHaveTextContent('無')
    expect(detail('記錄類型')).toHaveTextContent('距離＋時間')
  })

  it('找不到的動作 ID 顯示提示', async () => {
    renderApp('/exercises/no-such-exercise')

    expect(await screen.findByText('找不到這個動作')).toBeInTheDocument()
  })
})
