import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

async function exerciseList() {
  return screen.findByRole('list', { name: '動作清單' })
}

async function search(user: UserEvent, query: string) {
  const box = await screen.findByRole('searchbox', { name: '搜尋動作' })
  await user.clear(box)
  await user.type(box, query)
}

function goToTab(user: UserEvent, tab: '今天' | '動作庫') {
  return user.click(
    within(screen.getByRole('navigation', { name: '主要分頁' })).getByRole('link', { name: tab }),
  )
}

/** 從動作庫建立一個「重量×次數」的自訂動作，建立後回到動作庫 */
async function createCustomExercise(user: UserEvent, name: string) {
  await user.click(await screen.findByRole('link', { name: '新增自訂動作' }))
  await user.type(await screen.findByRole('textbox', { name: '中文名稱' }), name)
  await user.click(
    within(screen.getByRole('group', { name: '主要部位' })).getByRole('checkbox', { name: '胸' }),
  )
  await user.click(
    within(screen.getByRole('radiogroup', { name: '器材' })).getByRole('radio', { name: '器械' }),
  )
  await user.click(
    within(screen.getByRole('radiogroup', { name: '記錄類型' })).getByRole('radio', {
      name: '重量×次數',
    }),
  )
  await user.click(screen.getByRole('button', { name: '儲存' }))
  expect(await screen.findByRole('heading', { name: '動作庫' })).toBeInTheDocument()
}

/** 在今天的訓練加入該動作，讓它「已有紀錄」 */
async function addToTodayWorkout(user: UserEvent, name: string) {
  await goToTab(user, '今天')
  await user.click(await screen.findByRole('button', { name: '加入動作' }))
  const dialog = await screen.findByRole('dialog', { name: '加入動作' })
  await user.click(await within(dialog).findByRole('button', { name: new RegExp(`^${name}`) }))
  return screen.findByRole('region', { name })
}

/** 從動作庫搜尋並點進動作詳情 */
async function openDetailFromLibrary(user: UserEvent, name: string) {
  await search(user, name)
  await user.click(within(await exerciseList()).getByRole('link', { name: new RegExp(name) }))
  expect(await screen.findByRole('heading', { level: 1, name })).toBeInTheDocument()
}

/** 建立自訂動作並在今天的訓練加入它，最後停在它的動作詳情頁 */
async function createCustomWithRecord(user: UserEvent, name: string) {
  await createCustomExercise(user, name)
  await addToTodayWorkout(user, name)
  await goToTab(user, '動作庫')
  await openDetailFromLibrary(user, name)
}

function trackingTypeGroup() {
  return screen.getByRole('radiogroup', { name: '記錄類型' })
}

describe('自訂動作的記錄類型鎖定', () => {
  it('已有紀錄時，編輯表單的記錄類型欄位停用，並提示「已有紀錄，無法變更記錄類型」', async () => {
    const { user } = renderApp('/exercises')
    await createCustomWithRecord(user, 'Smith 臥推')

    await user.click(screen.getByRole('link', { name: '編輯' }))
    await screen.findByRole('textbox', { name: '中文名稱' })

    for (const radio of within(trackingTypeGroup()).getAllByRole('radio')) {
      expect(radio).toBeDisabled()
    }
    expect(screen.getByText('已有紀錄，無法變更記錄類型')).toBeInTheDocument()
  })

  it('已有紀錄時仍可修改名稱並儲存，記錄類型維持不變，訓練頁顯示新名稱', async () => {
    const { user } = renderApp('/exercises')
    await createCustomWithRecord(user, 'Smith 臥推')
    await user.click(screen.getByRole('link', { name: '編輯' }))
    const name = await screen.findByRole('textbox', { name: '中文名稱' })

    await user.clear(name)
    await user.type(name, '史密斯臥推')
    await user.click(screen.getByRole('button', { name: '儲存' }))

    expect(await screen.findByRole('heading', { level: 1, name: '史密斯臥推' })).toBeInTheDocument()
    expect(screen.getByRole('definition', { name: '記錄類型' })).toHaveTextContent('重量×次數')
    await goToTab(user, '今天')
    expect(await screen.findByRole('region', { name: '史密斯臥推' })).toBeInTheDocument()
  })
})

describe('封存有紀錄的自訂動作', () => {
  it('已有紀錄時，動作詳情頁只提供「封存」，不提供「刪除」', async () => {
    const { user } = renderApp('/exercises')
    await createCustomWithRecord(user, 'Smith 臥推')

    expect(await screen.findByRole('button', { name: '封存' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '刪除' })).not.toBeInTheDocument()
  })

  it('封存後，詳情頁標示「已封存」；不出現在加入動作選單，但訓練頁仍顯示這個動作的名稱', async () => {
    const { user, reload } = renderApp('/exercises')
    await createCustomWithRecord(user, 'Smith 臥推')

    await user.click(await screen.findByRole('button', { name: '封存' }))
    expect(await screen.findByText('已封存')).toBeInTheDocument()

    reload()
    await goToTab(user, '今天')
    expect(await screen.findByRole('region', { name: 'Smith 臥推' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '加入動作' }))
    const dialog = await screen.findByRole('dialog', { name: '加入動作' })
    await user.type(within(dialog).getByRole('searchbox', { name: '搜尋動作' }), 'smith')
    expect(await within(dialog).findByText('找不到符合的動作')).toBeInTheDocument()
  })

  it('封存後，動作庫預設不列出；打開「顯示已隱藏／已封存」後看得到，並可以取消封存', async () => {
    const { user } = renderApp('/exercises')
    await createCustomWithRecord(user, 'Smith 臥推')
    await user.click(await screen.findByRole('button', { name: '封存' }))
    await screen.findByText('已封存')

    await user.click(screen.getByRole('link', { name: '返回動作庫' }))
    await search(user, 'smith')
    expect(await screen.findByText('找不到符合的動作')).toBeInTheDocument()

    await user.click(screen.getByRole('switch', { name: '顯示已隱藏／已封存' }))
    const row = within(await exerciseList()).getByRole('link', { name: /Smith 臥推/ })
    expect(row).toHaveTextContent('已封存')

    await user.click(row)
    await user.click(await screen.findByRole('button', { name: '取消封存' }))
    expect(await screen.findByRole('button', { name: '封存' })).toBeInTheDocument()
    expect(screen.queryByText('已封存')).not.toBeInTheDocument()

    await goToTab(user, '今天')
    await user.click(await screen.findByRole('button', { name: '加入動作' }))
    const dialog = await screen.findByRole('dialog', { name: '加入動作' })
    // 它已有紀錄，也會出現在「最近使用」，所以只看全部動作的清單
    const list = await within(dialog).findByRole('list', { name: '動作清單' })
    expect(within(list).getByRole('button', { name: /^Smith 臥推/ })).toBeInTheDocument()
  })
})

describe('刪除沒有紀錄的自訂動作', () => {
  it('沒有紀錄時提供「刪除」而沒有「封存」；確認對話框按「取消」時不會刪除', async () => {
    const { user } = renderApp('/exercises')
    await createCustomExercise(user, 'Smith 臥推')
    await openDetailFromLibrary(user, 'Smith 臥推')

    await user.click(await screen.findByRole('button', { name: '刪除' }))
    expect(screen.queryByRole('button', { name: '封存' })).not.toBeInTheDocument()

    const dialog = await screen.findByRole('alertdialog', { name: '刪除「Smith 臥推」？' })
    expect(dialog).toHaveTextContent('刪除後無法復原')
    await user.click(within(dialog).getByRole('button', { name: '取消' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Smith 臥推' })).toBeInTheDocument()
  })

  it('確認刪除後回到動作庫，動作永久刪除，重新整理後也不在', async () => {
    const { user, reload } = renderApp('/exercises')
    await createCustomExercise(user, 'Smith 臥推')
    await openDetailFromLibrary(user, 'Smith 臥推')

    await user.click(await screen.findByRole('button', { name: '刪除' }))
    const dialog = await screen.findByRole('alertdialog', { name: '刪除「Smith 臥推」？' })
    await user.click(within(dialog).getByRole('button', { name: '刪除' }))

    expect(await screen.findByRole('heading', { name: '動作庫' })).toBeInTheDocument()
    await user.click(screen.getByRole('switch', { name: '顯示已隱藏／已封存' }))
    await search(user, 'smith')
    expect(await screen.findByText('找不到符合的動作')).toBeInTheDocument()

    reload()
    await user.click(await screen.findByRole('switch', { name: '顯示已隱藏／已封存' }))
    expect(within(await exerciseList()).getAllByRole('listitem')).toHaveLength(66)
  })
})
