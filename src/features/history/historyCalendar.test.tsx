import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'
import { unlockDay } from '@/test/unlockDay'

/** 訓練頁上的訓練動作數（每個訓練動作的標題是 h2） */
function workoutExerciseCount() {
  return screen.queryAllByRole('heading', { level: 2 }).length
}

/** 從加入動作選單的全部動作清單加入一個動作，回傳該訓練動作的區塊 */
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

function goToTab(user: UserEvent, tab: '今天' | '歷史' | '動作庫') {
  return user.click(
    within(screen.getByRole('navigation', { name: '主要分頁' })).getByRole('link', { name: tab }),
  )
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

/** 日明細中某個動作各組的顯示文字，依順序 */
function setTexts(exercise: HTMLElement) {
  return within(within(exercise).getByRole('list', { name: '組' }))
    .getAllByRole('listitem')
    .map((item) => item.textContent)
}

/** 日明細（以日期命名的 region） */
function dayDetail(title: string) {
  return screen.findByRole('region', { name: title })
}

/** 月曆上某一天的按鈕，`day` 例如 `10月20日` */
async function calendarDay(day: string) {
  const grid = await screen.findByRole('grid')
  return within(grid).getByRole('button', { name: new RegExp(day) })
}

describe('歷史月曆', () => {
  it('顯示當月月曆，以週一為一週第一天，有訓練的日期標點', async () => {
    const { user } = renderApp('/day/2026-10-20')
    await addExercise(user, '槓鈴臥推')

    await goToTab(user, '歷史')

    const grid = await screen.findByRole('grid', { name: '2026年10月' })
    for (const week of within(grid).getAllByRole('row')) {
      expect(within(week).getAllByRole('button')[0]).toHaveAccessibleName(/星期一/)
    }
    await waitFor(async () => expect(await calendarDay('10月20日')).toHaveAccessibleName(/有訓練/))
    expect(await calendarDay('10月21日')).not.toHaveAccessibleName(/有訓練/)
    expect(await calendarDay('10月24日')).not.toHaveAccessibleName(/有訓練/)
  })

  it('可以切換上個月和下個月，但不能切換到未來月份；月曆上前一個月的日期也會標點', async () => {
    const { user } = renderApp('/day/2026-09-28')
    await addExercise(user, '槓鈴臥推')
    await goToTab(user, '歷史')

    await screen.findByRole('grid', { name: '2026年10月' })
    expect(screen.getByRole('button', { name: '前往下個月' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    // 10 月的月曆從 9/28（一）開始
    await waitFor(async () => expect(await calendarDay('9月28日')).toHaveAccessibleName(/有訓練/))

    await user.click(screen.getByRole('button', { name: '前往上個月' }))
    await screen.findByRole('grid', { name: '2026年9月' })
    await waitFor(async () => expect(await calendarDay('9月28日')).toHaveAccessibleName(/有訓練/))
    expect(await calendarDay('9月27日')).not.toHaveAccessibleName(/有訓練/)
    expect(screen.getByRole('button', { name: '前往下個月' })).not.toHaveAttribute('aria-disabled')

    await user.click(screen.getByRole('button', { name: '前往下個月' }))
    expect(await screen.findByRole('grid', { name: '2026年10月' })).toBeInTheDocument()
  })

  it('刪光某天的所有動作後，該日不再標點；按「復原」後重新標點', async () => {
    // 10/19 也有訓練：用它的標點確認月曆已載入，「沒有標點」的斷言才不會在載入前就通過
    const { user } = renderApp('/day/2026-10-19')
    await addExercise(user, '槓鈴深蹲')
    await user.click(screen.getByRole('button', { name: '後一天' }))
    await screen.findByRole('heading', { level: 1, name: '10/20（二）' })
    const card = await addExercise(user, '槓鈴臥推')
    await fillWeightReps(user, card, 1, '60', '8')
    await goToTab(user, '歷史')
    await waitFor(async () => expect(await calendarDay('10月20日')).toHaveAccessibleName(/有訓練/))

    await user.click(await calendarDay('10月20日'))
    await user.click(
      await within(await dayDetail('10/20（二）')).findByRole('link', { name: '編輯' }),
    )
    await user.click(
      within(await screen.findByRole('region', { name: '槓鈴臥推' })).getByRole('button', {
        name: '刪除動作',
      }),
    )
    const undo = await screen.findByRole('button', { name: '復原' })
    await goToTab(user, '歷史')
    await waitFor(async () => expect(await calendarDay('10月19日')).toHaveAccessibleName(/有訓練/))
    expect(await calendarDay('10月20日')).not.toHaveAccessibleName(/有訓練/)

    await user.click(undo)

    await waitFor(async () => expect(await calendarDay('10月20日')).toHaveAccessibleName(/有訓練/))
  })
})

describe('日明細', () => {
  it('點選日期後顯示當天的每日摘要、每個動作的每一組（標示熱身組）與備註', async () => {
    const { user } = renderApp('/day/2026-10-20')
    const bench = await addExercise(user, '槓鈴臥推')
    await fillWeightReps(user, bench, 1, '40', '10')
    await user.click(within(bench).getByRole('button', { name: '第 1 組熱身' }))
    await waitFor(() =>
      expect(within(bench).getByRole('button', { name: '第 1 組熱身' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    )
    await user.click(within(bench).getByRole('button', { name: '新增一組' }))
    await fillWeightReps(user, bench, 2, '60', '8')
    await user.click(within(bench).getByRole('button', { name: '第 2 組熱身' }))
    await waitFor(() =>
      expect(within(bench).getByRole('button', { name: '第 2 組熱身' })).toHaveAttribute(
        'aria-pressed',
        'false',
      ),
    )
    await user.type(within(bench).getByRole('textbox', { name: '備註' }), '左肩不適')
    const pullUp = await addExercise(user, '引體向上')
    await user.type(within(pullUp).getByRole('textbox', { name: '第 1 組次數' }), '10')

    await goToTab(user, '歷史')
    await user.click(await calendarDay('10月20日'))

    const detail = await dayDetail('10/20（二）')
    const summary = await within(detail).findByRole('region', { name: '每日摘要' })
    expect(within(summary).getByRole('definition', { name: '動作數' }).textContent).toBe('2')
    expect(within(summary).getByRole('definition', { name: '正式組數' }).textContent).toBe('2')
    expect(within(summary).getByRole('definition', { name: '總訓練量' }).textContent).toBe('480 kg')
    const exercises = within(detail).getAllByRole('article')
    expect(exercises.map((item) => within(item).getByRole('heading').textContent)).toEqual([
      '槓鈴臥推',
      '引體向上',
    ])
    const benchDetail = within(detail).getByRole('article', { name: '槓鈴臥推' })
    expect(setTexts(benchDetail)).toEqual(['熱身40kg×10', '60kg×8'])
    expect(within(benchDetail).getByText('左肩不適')).toBeInTheDocument()
    expect(setTexts(within(detail).getByRole('article', { name: '引體向上' }))).toEqual(['10下'])
  })

  it('點選沒有訓練的日期，明細顯示「這天沒有訓練」', async () => {
    const { user } = renderApp('/history')

    await user.click(await calendarDay('10月21日'))

    const detail = await dayDetail('10/21（三）')
    expect(await within(detail).findByText('這天沒有訓練')).toBeInTheDocument()
    expect(within(detail).queryByRole('link', { name: '編輯' })).not.toBeInTheDocument()
  })

  it('明細中的「編輯」進入該日的訓練頁', async () => {
    const { user } = renderApp('/day/2026-10-20')
    await addExercise(user, '槓鈴臥推')
    await goToTab(user, '歷史')
    await user.click(await calendarDay('10月20日'))

    const detail = await dayDetail('10/20（二）')
    await user.click(await within(detail).findByRole('link', { name: '編輯' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: '10/20（二）' }),
    ).toBeInTheDocument()
    expect(window.location.pathname).toBe(`${import.meta.env.BASE_URL}day/2026-10-20`)
    expect(await screen.findByRole('region', { name: '槓鈴臥推' })).toBeInTheDocument()
  })

  it('已封存的自訂動作，在日明細中仍顯示它的名稱', async () => {
    const { user } = renderApp('/exercises/new')
    await user.type(await screen.findByRole('textbox', { name: '中文名稱' }), 'Smith 臥推')
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
    await goToTab(user, '今天')
    const card = await addExercise(user, 'Smith 臥推')
    await fillWeightReps(user, card, 1, '50', '10')

    await goToTab(user, '動作庫')
    await user.type(await screen.findByRole('searchbox', { name: '搜尋動作' }), 'Smith')
    await user.click(
      within(await screen.findByRole('list', { name: '動作清單' })).getByRole('link', {
        name: /Smith 臥推/,
      }),
    )
    await user.click(await screen.findByRole('button', { name: '封存' }))
    expect(await screen.findByText('已封存')).toBeInTheDocument()

    await goToTab(user, '歷史')
    await user.click(await calendarDay('10月24日'))

    const detail = await dayDetail('10/24（六）')
    const exercise = await within(detail).findByRole('article', { name: 'Smith 臥推' })
    expect(setTexts(exercise)).toEqual(['50kg×10'])
  })
})

describe('歷史預設選取今天', () => {
  it('進入歷史就顯示今天的明細，今天的日期按鈕是選取狀態', async () => {
    const { user } = renderApp()
    await addExercise(user, '槓鈴臥推')
    await goToTab(user, '歷史')

    const detail = await dayDetail('10/24（六）')
    expect(await within(detail).findByRole('heading', { name: '槓鈴臥推' })).toBeInTheDocument()
    expect(await calendarDay('10月24日')).toHaveAccessibleName(/已選取/)
  })

  it('今天沒有訓練時顯示「這天沒有訓練」，統計是本週', async () => {
    renderApp('/history')

    const detail = await dayDetail('10/24（六）')
    expect(await within(detail).findByText('這天沒有訓練')).toBeInTheDocument()
    expect(
      within(await screen.findByRole('region', { name: '統計' })).getByText('本週'),
    ).toBeInTheDocument()
  })

  it('切換月份後選取的日期不變，點選別的日期才換明細', async () => {
    const { user } = renderApp('/history')
    await dayDetail('10/24（六）')

    await user.click(await screen.findByRole('button', { name: '前往上個月' }))
    expect(await dayDetail('10/24（六）')).toBeInTheDocument()

    await user.click(await calendarDay('9月15日'))
    expect(await dayDetail('9/15（二）')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '10/24（六）' })).not.toBeInTheDocument()
  })
})
