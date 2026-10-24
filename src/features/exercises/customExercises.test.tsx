import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

async function exerciseList() {
  return screen.findByRole('list', { name: '動作清單' })
}

function detail(label: string) {
  return screen.getByRole('definition', { name: label })
}

async function search(user: UserEvent, query: string) {
  const box = screen.getByRole('searchbox', { name: '搜尋動作' })
  await user.clear(box)
  await user.type(box, query)
}

/** 勾選某個部位群組（主要部位／次要部位）裡的部位 */
async function toggleMuscle(user: UserEvent, group: '主要部位' | '次要部位', muscle: string) {
  await user.click(
    within(screen.getByRole('group', { name: group })).getByRole('checkbox', { name: muscle }),
  )
}

async function choose(user: UserEvent, group: '器材' | '記錄類型', option: string) {
  await user.click(
    within(screen.getByRole('radiogroup', { name: group })).getByRole('radio', { name: option }),
  )
}

/** 從動作庫點「新增自訂動作」開啟表單 */
async function openNewForm(user: UserEvent) {
  await user.click(await screen.findByRole('link', { name: '新增自訂動作' }))
  expect(await screen.findByRole('heading', { name: '新增自訂動作' })).toBeInTheDocument()
  // 表單要等既有動作載入（重名檢查用）後才出現
  await screen.findByRole('textbox', { name: '中文名稱' })
}

/** 填好除了名稱以外的必填欄位 */
async function fillRequiredExceptName(user: UserEvent) {
  await toggleMuscle(user, '主要部位', '胸')
  await choose(user, '器材', '器械')
  await choose(user, '記錄類型', '重量×次數')
}

async function createCustomExercise(user: UserEvent, name: string) {
  await openNewForm(user)
  await user.type(screen.getByRole('textbox', { name: '中文名稱' }), name)
  await fillRequiredExceptName(user)
  await user.click(screen.getByRole('button', { name: '儲存' }))
  expect(await screen.findByRole('heading', { name: '動作庫' })).toBeInTheDocument()
}

describe('新增自訂動作', () => {
  it('從動作庫新增後回到動作庫，可以搜尋到新動作', async () => {
    const { user } = renderApp('/exercises')
    await openNewForm(user)

    await user.type(screen.getByRole('textbox', { name: '中文名稱' }), '史密斯深蹲')
    await user.type(screen.getByRole('textbox', { name: '英文名稱' }), 'Smith Machine Squat')
    await toggleMuscle(user, '主要部位', '股四頭')
    await toggleMuscle(user, '主要部位', '臀')
    await toggleMuscle(user, '次要部位', '腿後側')
    await choose(user, '器材', '器械')
    await choose(user, '記錄類型', '重量×次數')
    await user.click(screen.getByRole('button', { name: '儲存' }))

    expect(await screen.findByRole('heading', { name: '動作庫' })).toBeInTheDocument()
    await search(user, 'smith')
    const list = await exerciseList()
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    const row = within(list).getByRole('link', { name: /史密斯深蹲/ })
    expect(row).toHaveTextContent('Smith Machine Squat')
    expect(row).toHaveTextContent('器械')

    await user.click(row)
    expect(await screen.findByRole('heading', { name: '史密斯深蹲' })).toBeInTheDocument()
    expect(detail('主要部位')).toHaveTextContent('股四頭、臀')
    expect(detail('次要部位')).toHaveTextContent('腿後側')
    expect(detail('器材')).toHaveTextContent('器械')
    expect(detail('記錄類型')).toHaveTextContent('重量×次數')
  })

  it('名稱和預設動作重複（忽略前後空白）時顯示「已有同名動作」，無法送出', async () => {
    const { user } = renderApp('/exercises')
    await openNewForm(user)

    await user.type(screen.getByRole('textbox', { name: '中文名稱' }), '  槓鈴臥推 ')
    await fillRequiredExceptName(user)
    await user.click(screen.getByRole('button', { name: '儲存' }))

    expect(await screen.findByText('已有同名動作')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '中文名稱' })).toBeInvalid()
    expect(screen.getByRole('heading', { name: '新增自訂動作' })).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: '取消' }))
    expect(within(await exerciseList()).getAllByRole('listitem')).toHaveLength(66)
  })

  it('名稱和自訂動作重複（忽略大小寫）時顯示「已有同名動作」，改名後可以送出', async () => {
    const { user } = renderApp('/exercises')
    await createCustomExercise(user, 'Smith 臥推')
    await openNewForm(user)

    const name = screen.getByRole('textbox', { name: '中文名稱' })
    await user.type(name, 'SMITH 臥推')
    await fillRequiredExceptName(user)
    await user.click(screen.getByRole('button', { name: '儲存' }))
    expect(await screen.findByText('已有同名動作')).toBeInTheDocument()

    await user.clear(name)
    await user.type(name, 'Smith 上斜臥推')
    expect(screen.queryByText('已有同名動作')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '儲存' }))

    expect(await screen.findByRole('heading', { name: '動作庫' })).toBeInTheDocument()
    await search(user, 'smith')
    expect(within(await exerciseList()).getAllByRole('listitem')).toHaveLength(2)
  })
})

describe('自訂動作表單的欄位規則', () => {
  it('什麼都沒填就送出時，顯示各必填欄位的錯誤，不會建立動作', async () => {
    const { user } = renderApp('/exercises')
    await openNewForm(user)

    await user.click(screen.getByRole('button', { name: '儲存' }))

    expect(await screen.findByText('請輸入中文名稱')).toBeInTheDocument()
    expect(screen.getByText('至少選擇 1 個主要部位')).toBeInTheDocument()
    expect(screen.getByText('請選擇器材')).toBeInTheDocument()
    expect(screen.getByText('請選擇記錄類型')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '新增自訂動作' })).toBeInTheDocument()
  })

  it('中文名稱最多 40 字、英文名稱最多 60 字', async () => {
    const { user } = renderApp('/exercises')
    await openNewForm(user)
    const nameZh = screen.getByRole('textbox', { name: '中文名稱' })
    const nameEn = screen.getByRole('textbox', { name: '英文名稱' })
    await fillRequiredExceptName(user)

    await user.click(nameZh)
    await user.paste('臥'.repeat(41))
    await user.click(nameEn)
    await user.paste('a'.repeat(61))
    await user.click(screen.getByRole('button', { name: '儲存' }))

    expect(await screen.findByText('中文名稱最多 40 字')).toBeInTheDocument()
    expect(screen.getByText('英文名稱最多 60 字')).toBeInTheDocument()

    await user.type(nameZh, '{Backspace}')
    await user.type(nameEn, '{Backspace}')
    await user.click(screen.getByRole('button', { name: '儲存' }))

    expect(await screen.findByRole('heading', { name: '動作庫' })).toBeInTheDocument()
    await search(user, 'a'.repeat(60))
    expect(within(await exerciseList()).getByText('臥'.repeat(40))).toBeInTheDocument()
  })

  it('次要部位和主要部位重複時顯示錯誤，取消重複後可以送出', async () => {
    const { user } = renderApp('/exercises')
    await openNewForm(user)
    await user.type(screen.getByRole('textbox', { name: '中文名稱' }), '地雷管推舉')
    await fillRequiredExceptName(user)
    await toggleMuscle(user, '次要部位', '胸')
    await toggleMuscle(user, '次要部位', '肩')

    await user.click(screen.getByRole('button', { name: '儲存' }))
    expect(await screen.findByText('次要部位不能和主要部位重複')).toBeInTheDocument()

    await toggleMuscle(user, '次要部位', '胸')
    await user.click(screen.getByRole('button', { name: '儲存' }))

    expect(await screen.findByRole('heading', { name: '動作庫' })).toBeInTheDocument()
    await search(user, '地雷管')
    await user.click(within(await exerciseList()).getByRole('link', { name: /地雷管推舉/ }))
    expect(await screen.findByRole('heading', { name: '地雷管推舉' })).toBeInTheDocument()
    expect(detail('主要部位')).toHaveTextContent('胸')
    expect(detail('次要部位')).toHaveTextContent('肩')
  })
})

describe('複製預設動作', () => {
  it('預設動作詳情頁點「複製為自訂動作」，表單帶入原動作資料，中文名稱為「{原名}（自訂）」', async () => {
    const { user } = renderApp('/exercises/barbell-bench-press')

    await user.click(await screen.findByRole('link', { name: '複製為自訂動作' }))
    expect(await screen.findByRole('heading', { name: '新增自訂動作' })).toBeInTheDocument()
    expect(await screen.findByRole('textbox', { name: '中文名稱' })).toHaveValue('槓鈴臥推（自訂）')
    expect(screen.getByRole('textbox', { name: '英文名稱' })).toHaveValue('Barbell Bench Press')
    const checkedIn = (group: string) =>
      within(screen.getByRole('group', { name: group })).getAllByRole('checkbox', { checked: true })
    expect(checkedIn('主要部位')).toHaveLength(1)
    expect(checkedIn('次要部位')).toHaveLength(2)
    expect(
      within(screen.getByRole('group', { name: '主要部位' })).getByRole('checkbox', { name: '胸' }),
    ).toBeChecked()
    for (const muscle of ['三頭', '肩']) {
      expect(
        within(screen.getByRole('group', { name: '次要部位' })).getByRole('checkbox', {
          name: muscle,
        }),
      ).toBeChecked()
    }
    expect(
      within(screen.getByRole('radiogroup', { name: '器材' })).getByRole('radio', { name: '槓鈴' }),
    ).toBeChecked()
    expect(
      within(screen.getByRole('radiogroup', { name: '記錄類型' })).getByRole('radio', {
        name: '重量×次數',
      }),
    ).toBeChecked()
  })

  it('直接儲存複製的動作後，動作庫同時有原本的預設動作與新的自訂動作', async () => {
    const { user } = renderApp('/exercises/barbell-bench-press')
    await user.click(await screen.findByRole('link', { name: '複製為自訂動作' }))
    await screen.findByRole('textbox', { name: '中文名稱' })

    await user.click(screen.getByRole('button', { name: '儲存' }))

    expect(await screen.findByRole('heading', { name: '動作庫' })).toBeInTheDocument()
    await search(user, '槓鈴臥推')
    const list = await exerciseList()
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    await user.click(within(list).getByRole('link', { name: /槓鈴臥推（自訂）/ }))
    expect(await screen.findByRole('heading', { name: '槓鈴臥推（自訂）' })).toBeInTheDocument()
    expect(detail('次要部位')).toHaveTextContent('三頭、肩')
    expect(screen.getByRole('link', { name: '編輯' })).toBeInTheDocument()
  })
})

/** 建立一個自訂動作後，從動作庫點進它的詳情頁並進入編輯 */
async function openEditFormOfNewCustom(user: UserEvent, name: string) {
  await createCustomExercise(user, name)
  await search(user, name)
  await user.click(within(await exerciseList()).getByRole('link', { name: new RegExp(name) }))
  await screen.findByRole('heading', { name })
  await user.click(screen.getByRole('link', { name: '編輯' }))
  expect(await screen.findByRole('heading', { name: '編輯自訂動作' })).toBeInTheDocument()
  return screen.findByRole('textbox', { name: '中文名稱' })
}

describe('編輯自訂動作', () => {
  it('在自訂動作的詳情頁進入編輯，表單帶入原本的資料，儲存後詳情頁顯示新資料', async () => {
    const { user, reload } = renderApp('/exercises')
    const name = await openEditFormOfNewCustom(user, 'Smith 臥推')

    expect(name).toHaveValue('Smith 臥推')
    expect(
      within(screen.getByRole('group', { name: '主要部位' })).getByRole('checkbox', { name: '胸' }),
    ).toBeChecked()
    expect(
      within(screen.getByRole('radiogroup', { name: '器材' })).getByRole('radio', { name: '器械' }),
    ).toBeChecked()
    expect(
      within(screen.getByRole('radiogroup', { name: '記錄類型' })).getByRole('radio', {
        name: '重量×次數',
      }),
    ).toBeChecked()

    await user.clear(name)
    await user.type(name, '史密斯臥推')
    await user.type(screen.getByRole('textbox', { name: '英文名稱' }), 'Smith Machine Bench Press')
    await toggleMuscle(user, '次要部位', '三頭')
    await choose(user, '器材', '其他')
    await user.click(screen.getByRole('button', { name: '儲存' }))

    expect(await screen.findByRole('heading', { name: '史密斯臥推' })).toBeInTheDocument()
    expect(detail('英文名稱')).toHaveTextContent('Smith Machine Bench Press')
    expect(detail('次要部位')).toHaveTextContent('三頭')
    expect(detail('器材')).toHaveTextContent('其他')

    reload()
    expect(await screen.findByRole('heading', { name: '史密斯臥推' })).toBeInTheDocument()
    expect(detail('器材')).toHaveTextContent('其他')
  })

  it('名稱沒有改動時不算和自己重名，可以直接儲存', async () => {
    const { user } = renderApp('/exercises')
    await openEditFormOfNewCustom(user, 'Smith 臥推')

    await choose(user, '記錄類型', '次數')
    await user.click(screen.getByRole('button', { name: '儲存' }))

    expect(await screen.findByRole('heading', { name: 'Smith 臥推' })).toBeInTheDocument()
    expect(detail('記錄類型')).toHaveTextContent('次數')
  })

  it('改成其他動作的名稱時顯示「已有同名動作」，無法送出', async () => {
    const { user } = renderApp('/exercises')
    const name = await openEditFormOfNewCustom(user, 'Smith 臥推')

    await user.clear(name)
    await user.type(name, '啞鈴臥推')
    await user.click(screen.getByRole('button', { name: '儲存' }))

    expect(await screen.findByText('已有同名動作')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '編輯自訂動作' })).toBeInTheDocument()
  })
})
