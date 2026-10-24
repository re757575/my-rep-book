import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

async function openPicker(user: UserEvent) {
  await user.click(await screen.findByRole('button', { name: '加入動作' }))
  const dialog = await screen.findByRole('dialog', { name: '加入動作' })
  // 等全部動作的清單載入，「最近使用」與它同時出現
  await within(dialog).findByRole('list', { name: '動作清單' })
  return dialog
}

/** 訓練頁上的訓練動作數（每個訓練動作的標題是 h2） */
function workoutExerciseCount() {
  return screen.queryAllByRole('heading', { level: 2 }).length
}

/** 從加入動作選單的全部動作清單加入一個動作，等它出現在訓練頁 */
async function addExercise(user: UserEvent, name: string) {
  const countBefore = workoutExerciseCount()
  const dialog = await openPicker(user)
  const list = within(dialog).getByRole('list', { name: '動作清單' })
  await user.click(within(list).getByRole('button', { name: new RegExp(`^${name}`) }))
  await waitFor(() => expect(workoutExerciseCount()).toBe(countBefore + 1))
}

/** 「最近使用」區塊中依序列出的動作（以中文名開頭比對） */
function recentRows(dialog: HTMLElement) {
  return within(within(dialog).getByRole('region', { name: '最近使用' })).getAllByRole('button')
}

async function goToTab(user: UserEvent, name: string) {
  await user.click(
    within(screen.getByRole('navigation', { name: '主要分頁' })).getByRole('link', { name }),
  )
}

/** 從動作庫進入預設動作的詳情頁隱藏它，再回到今天 */
async function hidePreset(user: UserEvent, name: string) {
  await goToTab(user, '動作庫')
  await user.type(await screen.findByRole('searchbox', { name: '搜尋動作' }), name)
  const list = await screen.findByRole('list', { name: '動作清單' })
  await user.click(within(list).getByRole('link', { name: new RegExp(`^${name}`) }))
  await user.click(await screen.findByRole('button', { name: '隱藏' }))
  expect(await screen.findByText('已隱藏')).toBeInTheDocument()
  await goToTab(user, '今天')
}

function startsWith(...names: string[]) {
  return names.map((name) => expect.stringMatching(new RegExp(`^${name}`)))
}

describe('加入動作選單的「最近使用」', () => {
  it('還沒有任何訓練時，不顯示「最近使用」', async () => {
    const { user } = renderApp()

    const dialog = await openPicker(user)

    expect(within(dialog).queryByRole('region', { name: '最近使用' })).not.toBeInTheDocument()
  })

  it('依最近一次使用的日期排序，不是依加入的先後：今天做的排在補記的前一天之前', async () => {
    const { user } = renderApp()
    await addExercise(user, '引體向上')
    await user.click(screen.getByRole('button', { name: '前一天' }))
    await screen.findByRole('heading', { level: 1, name: '10/23（五）' })
    await addExercise(user, '槓鈴臥推')

    const dialog = await openPicker(user)

    expect(recentRows(dialog).map((row) => row.textContent)).toEqual(
      startsWith('引體向上', '槓鈴臥推'),
    )
  })

  it('列出做過的動作，最近做的在前面，重複的只出現一次', async () => {
    const { user } = renderApp()
    await addExercise(user, '槓鈴臥推')
    await addExercise(user, '槓鈴深蹲')
    await addExercise(user, '引體向上')
    await addExercise(user, '槓鈴深蹲')

    const dialog = await openPicker(user)

    expect(recentRows(dialog).map((row) => row.textContent)).toEqual(
      startsWith('槓鈴深蹲', '引體向上', '槓鈴臥推'),
    )
  })

  it('已隱藏的預設動作不列入', async () => {
    const { user } = renderApp()
    await addExercise(user, '槓鈴臥推')
    await addExercise(user, '槓鈴深蹲')
    await hidePreset(user, '槓鈴臥推')

    const dialog = await openPicker(user)

    expect(recentRows(dialog).map((row) => row.textContent)).toEqual(startsWith('槓鈴深蹲'))
  })

  it('點選最近使用的動作，選單關閉並把它加入今天的訓練', async () => {
    const { user } = renderApp()
    await addExercise(user, '槓鈴臥推')

    const dialog = await openPicker(user)
    await user.click(recentRows(dialog)[0])

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getAllByRole('region', { name: '槓鈴臥推' })).toHaveLength(2))
  })

  it('搜尋或選擇分類時隱藏「最近使用」，清除後再出現', async () => {
    const { user } = renderApp()
    await addExercise(user, '槓鈴臥推')
    const dialog = await openPicker(user)
    const search = within(dialog).getByRole('searchbox', { name: '搜尋動作' })
    expect(within(dialog).getByRole('region', { name: '最近使用' })).toBeInTheDocument()

    await user.type(search, '臥推')
    expect(within(dialog).queryByRole('region', { name: '最近使用' })).not.toBeInTheDocument()

    await user.clear(search)
    expect(within(dialog).getByRole('region', { name: '最近使用' })).toBeInTheDocument()

    await user.click(within(dialog).getByRole('radio', { name: '胸' }))
    expect(within(dialog).queryByRole('region', { name: '最近使用' })).not.toBeInTheDocument()

    await user.click(within(dialog).getByRole('radio', { name: '全部' }))
    expect(within(dialog).getByRole('region', { name: '最近使用' })).toBeInTheDocument()
  })
})

describe('在加入動作選單中新增自訂動作', () => {
  it('建立後直接加入今天的訓練並關閉選單', async () => {
    const { user } = renderApp()
    const picker = await openPicker(user)

    await user.click(within(picker).getByRole('button', { name: '新增自訂動作' }))

    const dialog = await screen.findByRole('dialog', { name: '新增自訂動作' })
    await user.type(await within(dialog).findByRole('textbox', { name: '中文名稱' }), '戶外跑步')
    await user.click(
      within(within(dialog).getByRole('group', { name: '主要部位' })).getByRole('checkbox', {
        name: '有氧／全身',
      }),
    )
    await user.click(
      within(within(dialog).getByRole('radiogroup', { name: '器材' })).getByRole('radio', {
        name: '其他',
      }),
    )
    await user.click(
      within(within(dialog).getByRole('radiogroup', { name: '記錄類型' })).getByRole('radio', {
        name: '距離＋時間',
      }),
    )
    await user.click(within(dialog).getByRole('button', { name: '儲存' }))

    const card = await screen.findByRole('region', { name: '戶外跑步' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(within(card).getByRole('textbox', { name: '第 1 組距離（km）' })).toHaveValue('')
    expect(within(card).getByRole('textbox', { name: '第 1 組時間（mm:ss）' })).toHaveValue('')
  })

  it('按「取消」回到加入動作選單，不建立動作', async () => {
    const { user } = renderApp()
    const picker = await openPicker(user)
    await user.click(within(picker).getByRole('button', { name: '新增自訂動作' }))
    const dialog = await screen.findByRole('dialog', { name: '新增自訂動作' })
    await user.type(await within(dialog).findByRole('textbox', { name: '中文名稱' }), '戶外跑步')

    await user.click(within(dialog).getByRole('button', { name: '取消' }))

    const back = await screen.findByRole('dialog', { name: '加入動作' })
    await user.type(within(back).getByRole('searchbox', { name: '搜尋動作' }), '戶外跑步')
    expect(await within(back).findByText('找不到符合的動作')).toBeInTheDocument()
  })
})
