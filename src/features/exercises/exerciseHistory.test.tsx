import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { addDays, formatDateTitle } from '@/domain'
import { renderApp } from '@/test/renderApp'
import { unlockDay } from '@/test/unlockDay'
import { setSetType } from '@/test/setType'

const dateHeading = (name: string) => screen.findByRole('heading', { level: 1, name })

/** 訓練頁上的訓練動作數（每個訓練動作的標題是 h2） */
function workoutExerciseCount() {
  return screen.queryAllByRole('heading', { level: 2 }).length
}

/**
 * 從加入動作選單的全部動作清單加入一個動作，回傳該訓練動作的區塊。
 * 做過的動作也會出現在「最近使用」，所以從「動作清單」裡選。
 */
async function addExercise(user: UserEvent, name: string) {
  // 非今天的訓練頁預設鎖定，鎖定時沒有「加入動作」
  await unlockDay(user)
  const countBefore = workoutExerciseCount()
  await user.click(await screen.findByRole('button', { name: '加入動作' }))
  const dialog = await screen.findByRole('dialog', { name: '加入動作' })
  const list = await within(dialog).findByRole('list', { name: '動作清單' })
  await user.click(within(list).getByRole('button', { name: new RegExp(`^${name}`) }))
  await waitFor(() => expect(workoutExerciseCount()).toBe(countBefore + 1))
  return screen.getAllByRole('region', { name }).at(-1)!
}

/** 把某一組的重量與次數改成指定的值 */
async function fillWeightReps(
  user: UserEvent,
  card: HTMLElement,
  setNumber: number,
  weight: string,
  reps: string,
) {
  const weightField = await within(card).findByRole('textbox', {
    name: `第 ${setNumber} 組重量（kg）`,
  })
  await user.clear(weightField)
  await user.type(weightField, weight)
  const repsField = within(card).getByRole('textbox', { name: `第 ${setNumber} 組次數` })
  await user.clear(repsField)
  await user.type(repsField, reps)
}

function goToTab(user: UserEvent, tab: '今天' | '動作庫') {
  return user.click(
    within(screen.getByRole('navigation', { name: '主要分頁' })).getByRole('link', { name: tab }),
  )
}

/** 從動作庫搜尋並點進動作詳情 */
async function openDetail(user: UserEvent, name: string) {
  await goToTab(user, '動作庫')
  const box = await screen.findByRole('searchbox', { name: '搜尋動作' })
  await user.clear(box)
  await user.type(box, name)
  const list = await screen.findByRole('list', { name: '動作清單' })
  await user.click(within(list).getByRole('link', { name: new RegExp(`^${name}`) }))
  expect(await screen.findByRole('heading', { level: 1, name })).toBeInTheDocument()
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

async function nextDay(user: UserEvent, title: string) {
  await user.click(screen.getByRole('button', { name: '後一天' }))
  expect(await dateHeading(title)).toBeInTheDocument()
}

/** 動作詳情頁的歷史紀錄清單 */
function historyList() {
  return screen.findByRole('list', { name: '歷史紀錄' })
}

/** 歷史紀錄中各筆的日期，依畫面順序 */
async function historyDates() {
  return within(await historyList())
    .getAllByRole('article')
    .map((entry) => within(entry).getByRole('link').textContent)
}

/** 歷史紀錄中某一天的紀錄（以日期命名的 article） */
function historyEntry(date: string) {
  return screen.findByRole('article', { name: date })
}

/** 某一天紀錄中各組的顯示文字，依順序 */
function setTexts(entry: HTMLElement) {
  return within(within(entry).getByRole('list', { name: '組' }))
    .getAllByRole('listitem')
    .map((item) => item.textContent)
}

describe('動作歷史', () => {
  it('依日期由新到舊列出這個動作的每一次紀錄，每筆顯示日期與各組數值', async () => {
    const { user } = renderApp('/day/2026-10-20')
    expect(await dateHeading('10/20（二）')).toBeInTheDocument()
    const first = await addExercise(user, '槓鈴臥推')
    await fillWeightReps(user, first, 1, '60', '8')
    await user.click(within(first).getByRole('button', { name: '新增一組' }))
    await fillWeightReps(user, first, 2, '62.5', '6')
    await nextDay(user, '10/21（三）')
    await addExercise(user, '槓鈴深蹲')
    await nextDay(user, '10/22（四）')
    const second = await addExercise(user, '槓鈴臥推')
    await fillWeightReps(user, second, 1, '65', '5')

    await openDetail(user, '槓鈴臥推')

    expect(await historyDates()).toEqual(['2026/10/22（四）', '2026/10/20（二）'])
    const newest = await historyEntry('2026/10/22（四）')
    const oldest = await historyEntry('2026/10/20（二）')
    expect(setTexts(newest)).toEqual(['65kg×5'])
    expect(setTexts(oldest)).toEqual(['60kg×8', '62.5kg×6'])
  })

  it('熱身組有標示「熱身」，並顯示訓練動作的備註', async () => {
    const { user } = renderApp('/day/2026-10-20')
    const card = await addExercise(user, '槓鈴臥推')
    await fillWeightReps(user, card, 1, '40', '10')
    await setSetType(user, card, 1, '熱身')
    await user.click(within(card).getByRole('button', { name: '新增一組' }))
    await fillWeightReps(user, card, 2, '60', '8')
    await setSetType(user, card, 2, '正式')
    await user.type(within(card).getByRole('textbox', { name: '備註' }), '左肩不適')

    await openDetail(user, '槓鈴臥推')

    const entry = await historyEntry('2026/10/20（二）')
    expect(setTexts(entry)).toEqual(['熱身40kg×10', '60kg×8'])
    expect(within(entry).getByText('左肩不適')).toBeInTheDocument()
  })

  it('點某筆紀錄的日期，進入該日的訓練頁', async () => {
    const { user } = renderApp('/day/2026-10-20')
    await addExercise(user, '槓鈴臥推')
    await openDetail(user, '槓鈴臥推')

    await user.click(await screen.findByRole('link', { name: '2026/10/20（二）' }))

    expect(await dateHeading('10/20（二）')).toBeInTheDocument()
    expect(window.location.pathname).toBe(`${import.meta.env.BASE_URL}day/2026-10-20`)
    expect(await screen.findByRole('region', { name: '槓鈴臥推' })).toBeInTheDocument()
  })

  it('點今天的紀錄，進入今天的訓練頁', async () => {
    const { user } = renderApp()
    await addExercise(user, '槓鈴臥推')
    await openDetail(user, '槓鈴臥推')

    await user.click(await screen.findByRole('link', { name: '2026/10/24（六）' }))

    expect(await dateHeading('10/24（六）')).toBeInTheDocument()
    expect(window.location.pathname).toBe(import.meta.env.BASE_URL)
  })

  it('一開始載入 20 筆，按「載入更多」再載入更早的紀錄，全部載入後不再顯示按鈕', async () => {
    // 10/4 到 10/24 每天都做一次槓鈴臥推，共 21 筆
    const { user } = renderApp('/day/2026-10-04')
    expect(await dateHeading('10/4（日）')).toBeInTheDocument()
    await addExercise(user, '槓鈴臥推')
    for (let date = '2026-10-04'; date < '2026-10-24';) {
      date = addDays(date, 1)
      await nextDay(user, formatDateTitle(date))
      await addExercise(user, '槓鈴臥推')
    }

    await openDetail(user, '槓鈴臥推')

    const firstBatch = await historyDates()
    expect(firstBatch).toHaveLength(20)
    expect(firstBatch[0]).toBe('2026/10/24（六）')
    expect(firstBatch.at(-1)).toBe('2026/10/5（一）')

    await user.click(screen.getByRole('button', { name: '載入更多' }))

    await waitFor(async () => expect(await historyDates()).toHaveLength(21))
    expect((await historyDates()).at(-1)).toBe('2026/10/4（日）')
    expect(screen.queryByRole('button', { name: '載入更多' })).not.toBeInTheDocument()
  }, 30_000)

  it('紀錄不到 20 筆時不顯示「載入更多」', async () => {
    const { user } = renderApp('/day/2026-10-20')
    await addExercise(user, '槓鈴臥推')

    await openDetail(user, '槓鈴臥推')

    expect(await historyDates()).toEqual(['2026/10/20（二）'])
    expect(screen.queryByRole('button', { name: '載入更多' })).not.toBeInTheDocument()
  })

  it('已封存的自訂動作，動作詳情頁照常顯示名稱與所有紀錄', async () => {
    const { user, reload } = renderApp('/exercises')
    await createCustomExercise(user, 'Smith 臥推')
    await goToTab(user, '今天')
    const card = await addExercise(user, 'Smith 臥推')
    await fillWeightReps(user, card, 1, '50', '10')
    await openDetail(user, 'Smith 臥推')
    await user.click(await screen.findByRole('button', { name: '封存' }))
    expect(await screen.findByText('已封存')).toBeInTheDocument()

    reload()

    expect(await screen.findByRole('heading', { level: 1, name: 'Smith 臥推' })).toBeInTheDocument()
    expect(screen.getByText('已封存')).toBeInTheDocument()
    expect(await historyDates()).toEqual(['2026/10/24（六）'])
    expect(setTexts(await historyEntry('2026/10/24（六）'))).toEqual(['50kg×10'])
  })

  it('已隱藏的預設動作，動作詳情頁照常顯示紀錄', async () => {
    const { user, reload } = renderApp('/day/2026-10-20')
    const card = await addExercise(user, '槓鈴臥推')
    await fillWeightReps(user, card, 1, '60', '8')
    await openDetail(user, '槓鈴臥推')
    await user.click(screen.getByRole('button', { name: '隱藏' }))
    expect(await screen.findByText('已隱藏')).toBeInTheDocument()

    reload()

    expect(await screen.findByText('已隱藏')).toBeInTheDocument()
    expect(await historyDates()).toEqual(['2026/10/20（二）'])
    expect(setTexts(await historyEntry('2026/10/20（二）'))).toEqual(['60kg×8'])
  })

  it('沒有紀錄的動作顯示「還沒有紀錄」', async () => {
    renderApp('/exercises/barbell-bench-press')

    expect(await screen.findByRole('heading', { level: 2, name: '歷史紀錄' })).toBeInTheDocument()
    expect(await screen.findByText('還沒有紀錄')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: '歷史紀錄' })).not.toBeInTheDocument()
  })
})
