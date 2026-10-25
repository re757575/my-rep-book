import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

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
  const countBefore = workoutExerciseCount()
  await user.click(await screen.findByRole('button', { name: '加入動作' }))
  const dialog = await screen.findByRole('dialog', { name: '加入動作' })
  const list = await within(dialog).findByRole('list', { name: '動作清單' })
  await user.click(within(list).getByRole('button', { name: new RegExp(`^${name}`) }))
  await waitFor(() => expect(workoutExerciseCount()).toBe(countBefore + 1))
  // 同一個動作可以加入多次，新加入的在最後面
  return screen.getAllByRole('region', { name }).at(-1)!
}

function field(card: HTMLElement, name: string) {
  return within(card).getByRole<HTMLInputElement>('textbox', { name })
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
  const repsField = field(card, `第 ${setNumber} 組次數`)
  await user.clear(repsField)
  await user.type(repsField, reps)
}

/** 在檢視中的日期記錄槓鈴臥推 60kg×8、60kg×8、62.5kg×6 */
async function recordBench(user: UserEvent) {
  const card = await addExercise(user, '槓鈴臥推')
  await fillWeightReps(user, card, 1, '60', '8')
  await user.click(within(card).getByRole('button', { name: '新增一組' }))
  await user.click(within(card).getByRole('button', { name: '新增一組' }))
  await fillWeightReps(user, card, 3, '62.5', '6')
  return card
}

async function pickDate(user: UserEvent, day: RegExp) {
  await user.click(screen.getByRole('button', { name: '選擇日期' }))
  const picker = await screen.findByRole('dialog', { name: '選擇日期' })
  await user.click(within(picker).getByRole('button', { name: day }))
}

describe('上次紀錄與第一組預填', () => {
  it('在 10/20 補記後，10/24 加入同一個動作，會顯示上次紀錄並預填第一組', async () => {
    const { user } = renderApp('/day/2026-10-20')
    expect(await dateHeading('10/20（二）')).toBeInTheDocument()
    await recordBench(user)
    await user.click(screen.getByRole('button', { name: '回到今天' }))
    expect(await dateHeading('10/24（六）')).toBeInTheDocument()

    const card = await addExercise(user, '槓鈴臥推')

    expect(
      await within(card).findByText('上次（10/20）：60kg×8、60kg×8、62.5kg×6'),
    ).toBeInTheDocument()
    expect(field(card, '第 1 組重量（kg）')).toHaveValue('60')
    expect(field(card, '第 1 組次數')).toHaveValue('8')
    expect(within(card).queryByRole('textbox', { name: /第 2 組/ })).not.toBeInTheDocument()
  })

  it('切到 10/15 加入同一個動作，沒有上次紀錄，第一組保持空白', async () => {
    const { user } = renderApp('/day/2026-10-20')
    expect(await dateHeading('10/20（二）')).toBeInTheDocument()
    await recordBench(user)
    await pickDate(user, /10月15日/)
    expect(await dateHeading('10/15（四）')).toBeInTheDocument()

    const card = await addExercise(user, '槓鈴臥推')

    expect(field(card, '第 1 組重量（kg）')).toHaveValue('')
    expect(field(card, '第 1 組次數')).toHaveValue('')
    expect(within(card).queryByText(/^上次/)).not.toBeInTheDocument()
  })

  it('從沒做過的動作不顯示「上次」那一列', async () => {
    const { user } = renderApp('/day/2026-10-20')
    await recordBench(user)
    await user.click(screen.getByRole('button', { name: '回到今天' }))
    expect(await dateHeading('10/24（六）')).toBeInTheDocument()

    const squat = await addExercise(user, '槓鈴深蹲')
    const bench = await addExercise(user, '槓鈴臥推')

    // 等臥推的上次紀錄出現，確定上次紀錄已經載入完
    expect(await within(bench).findByText(/^上次（10\/20）/)).toBeInTheDocument()
    expect(within(squat).queryByText(/^上次/)).not.toBeInTheDocument()
    expect(field(squat, '第 1 組重量（kg）')).toHaveValue('')
  })

  it('當天的紀錄不算上次紀錄：當天已做過的動作再加入一次，第一組不預填', async () => {
    const { user } = renderApp()
    await recordBench(user)

    const card = await addExercise(user, '槓鈴臥推')

    expect(field(card, '第 1 組重量（kg）')).toHaveValue('')
    expect(within(card).queryByText(/^上次/)).not.toBeInTheDocument()
  })

  it('上次紀錄的第一組是熱身組時，預填改取第一個正式組，熱身組也不顯示在上次紀錄', async () => {
    const { user } = renderApp('/day/2026-10-20')
    const history = await addExercise(user, '槓鈴臥推')
    await fillWeightReps(user, history, 1, '40', '10')
    await user.click(within(history).getByRole('button', { name: '第 1 組熱身' }))
    await waitFor(() =>
      expect(within(history).getByRole('button', { name: '第 1 組熱身' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    )
    await user.click(within(history).getByRole('button', { name: '新增一組' }))
    await fillWeightReps(user, history, 2, '60', '8')
    await user.click(within(history).getByRole('button', { name: '第 2 組熱身' }))
    await waitFor(() =>
      expect(within(history).getByRole('button', { name: '第 2 組熱身' })).toHaveAttribute(
        'aria-pressed',
        'false',
      ),
    )
    await user.click(screen.getByRole('button', { name: '回到今天' }))
    expect(await dateHeading('10/24（六）')).toBeInTheDocument()

    const card = await addExercise(user, '槓鈴臥推')

    expect(await within(card).findByText('上次（10/20）：60kg×8')).toBeInTheDocument()
    expect(field(card, '第 1 組重量（kg）')).toHaveValue('60')
    expect(field(card, '第 1 組次數')).toHaveValue('8')
    expect(within(card).getByRole('button', { name: '第 1 組熱身' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('某個動作的組全部刪光後，按「新增一組」依上次紀錄預填', async () => {
    const { user } = renderApp('/day/2026-10-20')
    await recordBench(user)
    await user.click(screen.getByRole('button', { name: '回到今天' }))
    expect(await dateHeading('10/24（六）')).toBeInTheDocument()
    const card = await addExercise(user, '槓鈴臥推')
    await fillWeightReps(user, card, 1, '70', '3')

    await user.click(within(card).getByRole('button', { name: '刪除第 1 組' }))
    await waitFor(() =>
      expect(within(card).queryByRole('textbox', { name: /第 1 組/ })).not.toBeInTheDocument(),
    )
    await user.click(within(card).getByRole('button', { name: '新增一組' }))

    expect(await within(card).findByRole('textbox', { name: '第 1 組重量（kg）' })).toHaveValue(
      '60',
    )
    expect(field(card, '第 1 組次數')).toHaveValue('8')
  })
})

describe('熱身組', () => {
  it('可以切換某一組的熱身標記，重新整理後仍在', async () => {
    const { user, reload } = renderApp()
    const card = await addExercise(user, '槓鈴臥推')
    const toggle = within(card).getByRole('button', { name: '第 1 組熱身' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')

    await user.click(toggle)

    await waitFor(() =>
      expect(within(card).getByRole('button', { name: '第 1 組熱身' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    )
    reload()
    const reloaded = await screen.findByRole('region', { name: '槓鈴臥推' })
    expect(within(reloaded).getByRole('button', { name: '第 1 組熱身' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await user.click(within(reloaded).getByRole('button', { name: '第 1 組熱身' }))

    await waitFor(() =>
      expect(within(reloaded).getByRole('button', { name: '第 1 組熱身' })).toHaveAttribute(
        'aria-pressed',
        'false',
      ),
    )
  })

  it('按「新增一組」時，連同熱身標記一起複製', async () => {
    const { user } = renderApp()
    const card = await addExercise(user, '槓鈴臥推')
    await fillWeightReps(user, card, 1, '40', '10')
    await user.click(within(card).getByRole('button', { name: '第 1 組熱身' }))
    await waitFor(() =>
      expect(within(card).getByRole('button', { name: '第 1 組熱身' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    )

    await user.click(within(card).getByRole('button', { name: '新增一組' }))

    expect(await within(card).findByRole('button', { name: '第 2 組熱身' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(field(card, '第 2 組重量（kg）')).toHaveValue('40')
    expect(field(card, '第 2 組次數')).toHaveValue('10')
  })
})
