import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

/** 從加入動作選單加入一個動作，回傳該訓練動作的區塊 */
async function addExercise(user: UserEvent, name: string) {
  await user.click(screen.getByRole('button', { name: '加入動作' }))
  const dialog = await screen.findByRole('dialog', { name: '加入動作' })
  await user.click(await within(dialog).findByRole('button', { name: new RegExp(`^${name}`) }))
  return screen.findByRole('region', { name })
}

describe('今天的訓練頁', () => {
  it('打開 App 顯示今天的訓練頁，標題是 M/D（週）', () => {
    renderApp()

    expect(screen.getByRole('heading', { level: 1, name: '10/24（六）' })).toBeInTheDocument()
  })
})

describe('加入動作與記錄重量×次數', () => {
  it('選擇槓鈴臥推後選單關閉，動作出現在訓練頁，並自動建立空白的第一組', async () => {
    const { user } = renderApp()

    await user.click(screen.getByRole('button', { name: '加入動作' }))
    const dialog = await screen.findByRole('dialog', { name: '加入動作' })
    await user.click(await within(dialog).findByRole('button', { name: /^槓鈴臥推/ }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const card = await screen.findByRole('region', { name: '槓鈴臥推' })
    const weight = within(card).getByRole('textbox', { name: '第 1 組重量（kg）' })
    const reps = within(card).getByRole('textbox', { name: '第 1 組次數' })
    expect(weight).toHaveValue('')
    expect(reps).toHaveValue('')
    expect(weight).toHaveAttribute('inputmode', 'decimal')
    expect(reps).toHaveAttribute('inputmode', 'numeric')
    expect(within(card).queryByRole('textbox', { name: /第 2 組/ })).not.toBeInTheDocument()
  })

  it('輸入重量與次數即自動儲存，沒有儲存按鈕或完成勾選，重新整理後仍在', async () => {
    const { user, reload } = renderApp()
    const card = await addExercise(user, '槓鈴臥推')

    await user.type(within(card).getByRole('textbox', { name: '第 1 組重量（kg）' }), '62.5')
    await user.type(within(card).getByRole('textbox', { name: '第 1 組次數' }), '8')

    expect(screen.queryByRole('button', { name: /儲存/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()

    reload()

    const reloaded = await screen.findByRole('region', { name: '槓鈴臥推' })
    expect(within(reloaded).getByRole('textbox', { name: '第 1 組重量（kg）' })).toHaveValue('62.5')
    expect(within(reloaded).getByRole('textbox', { name: '第 1 組次數' })).toHaveValue('8')
  })

  it('按「新增一組」時，複製本次最後一組的數值', async () => {
    const { user } = renderApp()
    const card = await addExercise(user, '槓鈴臥推')
    await user.type(within(card).getByRole('textbox', { name: '第 1 組重量（kg）' }), '60')
    await user.type(within(card).getByRole('textbox', { name: '第 1 組次數' }), '8')

    await user.click(within(card).getByRole('button', { name: '新增一組' }))

    expect(await within(card).findByRole('textbox', { name: '第 2 組重量（kg）' })).toHaveValue(
      '60',
    )
    expect(within(card).getByRole('textbox', { name: '第 2 組次數' })).toHaveValue('8')
  })

  it('加入槓鈴臥推、記錄 3 組，重新整理後資料仍在', async () => {
    const { user, reload } = renderApp()
    const card = await addExercise(user, '槓鈴臥推')
    await user.type(within(card).getByRole('textbox', { name: '第 1 組重量（kg）' }), '60')
    await user.type(within(card).getByRole('textbox', { name: '第 1 組次數' }), '8')
    await user.click(within(card).getByRole('button', { name: '新增一組' }))
    await user.click(within(card).getByRole('button', { name: '新增一組' }))
    const thirdWeight = await within(card).findByRole('textbox', { name: '第 3 組重量（kg）' })
    await user.clear(thirdWeight)
    await user.type(thirdWeight, '62.5')
    const thirdReps = within(card).getByRole('textbox', { name: '第 3 組次數' })
    await user.clear(thirdReps)
    await user.type(thirdReps, '6')

    reload()

    const reloaded = await screen.findByRole('region', { name: '槓鈴臥推' })
    const setValues = [1, 2, 3].map((n) => [
      within(reloaded).getByRole<HTMLInputElement>('textbox', { name: `第 ${n} 組重量（kg）` }),
      within(reloaded).getByRole<HTMLInputElement>('textbox', { name: `第 ${n} 組次數` }),
    ])
    expect(setValues.map(([weight, reps]) => [weight.value, reps.value])).toEqual([
      ['60', '8'],
      ['60', '8'],
      ['62.5', '6'],
    ])
    expect(within(reloaded).queryByRole('textbox', { name: /第 4 組/ })).not.toBeInTheDocument()
  })

  it('再加入一個動作時，出現在清單最後面', async () => {
    const { user } = renderApp()
    await addExercise(user, '槓鈴臥推')

    await addExercise(user, '槓鈴深蹲')

    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['槓鈴臥推', '槓鈴深蹲'])
  })
})

describe('加入動作選單', () => {
  it('點「加入動作」開啟全螢幕選單，有搜尋、分類和動作清單，網址不變', async () => {
    const { user } = renderApp()
    const pathBefore = window.location.pathname

    await user.click(screen.getByRole('button', { name: '加入動作' }))

    const dialog = await screen.findByRole('dialog', { name: '加入動作' })
    expect(within(dialog).getByRole('searchbox', { name: '搜尋動作' })).toBeInTheDocument()
    expect(within(dialog).getByRole('radiogroup', { name: '篩選分類' })).toBeInTheDocument()
    const list = await within(dialog).findByRole('list', { name: '動作清單' })
    expect(within(list).getByRole('button', { name: /槓鈴臥推/ })).toBeInTheDocument()
    expect(window.location.pathname).toBe(pathBefore)
  })

  it('已隱藏的預設動作不出現在選單中', async () => {
    const { user } = renderApp('/exercises/barbell-bench-press')
    await user.click(await screen.findByRole('button', { name: '隱藏' }))
    expect(await screen.findByText('已隱藏')).toBeInTheDocument()
    await user.click(
      within(screen.getByRole('navigation', { name: '主要分頁' })).getByRole('link', {
        name: '今天',
      }),
    )

    await user.click(screen.getByRole('button', { name: '加入動作' }))

    const list = await within(await screen.findByRole('dialog')).findByRole('list', {
      name: '動作清單',
    })
    expect(within(list).queryByText('槓鈴臥推')).not.toBeInTheDocument()
    expect(within(list).getByText('啞鈴臥推')).toBeInTheDocument()
  })

  it('列出所有記錄類型的動作', async () => {
    const { user } = renderApp()

    await user.click(screen.getByRole('button', { name: '加入動作' }))

    const list = await within(await screen.findByRole('dialog')).findByRole('list', {
      name: '動作清單',
    })
    expect(within(list).getByText('槓鈴深蹲')).toBeInTheDocument()
    expect(within(list).getByText('引體向上')).toBeInTheDocument()
    expect(within(list).getByText('平板支撐')).toBeInTheDocument()
    expect(within(list).getByText('跑步機')).toBeInTheDocument()
  })

  it('可以搜尋與依分類篩選', async () => {
    const { user } = renderApp()
    await user.click(screen.getByRole('button', { name: '加入動作' }))
    const dialog = await screen.findByRole('dialog', { name: '加入動作' })

    await user.type(within(dialog).getByRole('searchbox', { name: '搜尋動作' }), 'bench')
    await user.click(within(dialog).getByRole('radio', { name: '手臂：三頭' }))

    const list = await within(dialog).findByRole('list', { name: '動作清單' })
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(within(list).getByText('窄握臥推')).toBeInTheDocument()
    expect(within(list).getByText('椅上撐體')).toBeInTheDocument()
  })
})
