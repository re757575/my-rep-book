import { screen, waitFor, within } from '@testing-library/react'
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

describe('備註', () => {
  it('每個訓練動作都有備註欄，輸入後自動儲存，重新整理後仍在', async () => {
    const { user, reload } = renderApp()
    const card = await addExercise(user, '槓鈴臥推')

    const note = within(card).getByRole('textbox', { name: '備註' })
    expect(note).toHaveValue('')
    await user.type(note, '左肩不適')

    reload()

    const reloaded = await screen.findByRole('region', { name: '槓鈴臥推' })
    expect(within(reloaded).getByRole('textbox', { name: '備註' })).toHaveValue('左肩不適')
  })
})

/** 訓練頁上各訓練動作的名稱，依畫面順序 */
function exerciseOrder() {
  return screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)
}

describe('調整動作順序', () => {
  it('第一個動作的「上移」與最後一個動作的「下移」為停用狀態', async () => {
    const { user } = renderApp()
    const first = await addExercise(user, '槓鈴臥推')
    const middle = await addExercise(user, '槓鈴深蹲')
    const last = await addExercise(user, '硬舉')

    expect(within(first).getByRole('button', { name: '上移' })).toBeDisabled()
    expect(within(first).getByRole('button', { name: '下移' })).toBeEnabled()
    expect(within(middle).getByRole('button', { name: '上移' })).toBeEnabled()
    expect(within(middle).getByRole('button', { name: '下移' })).toBeEnabled()
    expect(within(last).getByRole('button', { name: '上移' })).toBeEnabled()
    expect(within(last).getByRole('button', { name: '下移' })).toBeDisabled()
  })

  it('只有一個動作時，「上移」與「下移」都停用', async () => {
    const { user } = renderApp()
    const only = await addExercise(user, '槓鈴臥推')

    expect(within(only).getByRole('button', { name: '上移' })).toBeDisabled()
    expect(within(only).getByRole('button', { name: '下移' })).toBeDisabled()
  })

  it('「上移」與「下移」和相鄰動作交換位置並儲存，重新整理後順序不變', async () => {
    const { user, reload } = renderApp()
    const bench = await addExercise(user, '槓鈴臥推')
    const squat = await addExercise(user, '槓鈴深蹲')
    const deadlift = await addExercise(user, '硬舉')

    await user.click(within(deadlift).getByRole('button', { name: '上移' }))
    await waitFor(() => expect(exerciseOrder()).toEqual(['槓鈴臥推', '硬舉', '槓鈴深蹲']))

    await user.click(within(squat).getByRole('button', { name: '上移' }))
    await waitFor(() => expect(exerciseOrder()).toEqual(['槓鈴臥推', '槓鈴深蹲', '硬舉']))

    await user.click(within(bench).getByRole('button', { name: '下移' }))
    await waitFor(() => expect(exerciseOrder()).toEqual(['槓鈴深蹲', '槓鈴臥推', '硬舉']))

    reload()

    await screen.findByRole('region', { name: '槓鈴臥推' })
    expect(exerciseOrder()).toEqual(['槓鈴深蹲', '槓鈴臥推', '硬舉'])
  })
})

/** 某訓練動作各組的重量×次數，依畫面順序 */
function setValuesIn(card: HTMLElement) {
  const weights = within(card).getAllByRole<HTMLInputElement>('textbox', { name: /組重量/ })
  const reps = within(card).getAllByRole<HTMLInputElement>('textbox', { name: /組次數/ })
  return weights.map((weight, index) => `${weight.value}×${reps[index].value}`)
}

/** 加入槓鈴臥推並記錄 60×8、62.5×6、62.5×5 三組 */
async function benchWithThreeSets(user: UserEvent) {
  const card = await addExercise(user, '槓鈴臥推')
  await user.type(within(card).getByRole('textbox', { name: '第 1 組重量（kg）' }), '60')
  await user.type(within(card).getByRole('textbox', { name: '第 1 組次數' }), '8')
  for (const [n, weight, reps] of [
    [2, '62.5', '6'],
    [3, '62.5', '5'],
  ] as const) {
    await user.click(within(card).getByRole('button', { name: '新增一組' }))
    const weightField = await within(card).findByRole('textbox', { name: `第 ${n} 組重量（kg）` })
    await user.clear(weightField)
    await user.type(weightField, weight)
    const repsField = within(card).getByRole('textbox', { name: `第 ${n} 組次數` })
    await user.clear(repsField)
    await user.type(repsField, reps)
  }
  return card
}

describe('刪除一組與復原', () => {
  it('刪除一組時直接刪除、不跳確認視窗，並顯示 toast「已刪除一組」附「復原」', async () => {
    const { user } = renderApp()
    const card = await benchWithThreeSets(user)

    await user.click(within(card).getByRole('button', { name: '刪除第 2 組' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    await waitFor(() => expect(setValuesIn(card)).toEqual(['60×8', '62.5×5']))
    expect(await screen.findByText('已刪除一組')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '復原' })).toBeInTheDocument()
  })

  it('按「復原」後，被刪除的組回到原本的位置，數值和刪除前相同，重新整理後仍在', async () => {
    const { user, reload } = renderApp()
    const card = await benchWithThreeSets(user)
    await user.click(within(card).getByRole('button', { name: '刪除第 2 組' }))
    await waitFor(() => expect(setValuesIn(card)).toEqual(['60×8', '62.5×5']))

    await user.click(await screen.findByRole('button', { name: '復原' }))

    await waitFor(() => expect(setValuesIn(card)).toEqual(['60×8', '62.5×6', '62.5×5']))
    reload()
    const reloaded = await screen.findByRole('region', { name: '槓鈴臥推' })
    expect(setValuesIn(reloaded)).toEqual(['60×8', '62.5×6', '62.5×5'])
  })
})

describe('復原的 toast', () => {
  it('大約 5 秒後消失', async () => {
    const { user } = renderApp()
    const bench = await addExercise(user, '槓鈴臥推')
    await user.click(within(bench).getByRole('button', { name: '刪除第 1 組' }))
    const message = await screen.findByText('已刪除一組')

    await new Promise((resolve) => setTimeout(resolve, 4000))
    expect(message).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('已刪除一組')).not.toBeInTheDocument(), {
      timeout: 3000,
    })
  }, 10_000)
})

describe('刪除動作與復原', () => {
  it('刪除一個動作時直接刪除、不跳確認視窗，toast 顯示「已刪除『{動作名稱}』」附「復原」', async () => {
    const { user } = renderApp()
    await addExercise(user, '槓鈴臥推')
    const squat = await addExercise(user, '槓鈴深蹲')

    await user.click(within(squat).getByRole('button', { name: '刪除動作' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    await waitFor(() => expect(exerciseOrder()).toEqual(['槓鈴臥推']))
    expect(await screen.findByText('已刪除『槓鈴深蹲』')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '復原' })).toBeInTheDocument()
  })

  it('按「復原」後，被刪除的動作回到原本的位置，各組數值與備註都和刪除前相同', async () => {
    const { user, reload } = renderApp()
    await benchWithThreeSets(user)
    await user.type(
      within(screen.getByRole('region', { name: '槓鈴臥推' })).getByRole('textbox', {
        name: '備註',
      }),
      '換了握法',
    )
    await addExercise(user, '槓鈴深蹲')
    await user.click(
      within(screen.getByRole('region', { name: '槓鈴臥推' })).getByRole('button', {
        name: '刪除動作',
      }),
    )
    await waitFor(() => expect(exerciseOrder()).toEqual(['槓鈴深蹲']))

    await user.click(await screen.findByRole('button', { name: '復原' }))

    await waitFor(() => expect(exerciseOrder()).toEqual(['槓鈴臥推', '槓鈴深蹲']))
    reload()
    const bench = await screen.findByRole('region', { name: '槓鈴臥推' })
    expect(exerciseOrder()).toEqual(['槓鈴臥推', '槓鈴深蹲'])
    expect(setValuesIn(bench)).toEqual(['60×8', '62.5×6', '62.5×5'])
    expect(within(bench).getByRole('textbox', { name: '備註' })).toHaveValue('換了握法')
  })

  it('刪除最後一個動作時整筆訓練一併刪除；復原時一併還原，重新整理後仍在', async () => {
    const { user, reload } = renderApp()
    const bench = await addExercise(user, '槓鈴臥推')
    await user.type(within(bench).getByRole('textbox', { name: '第 1 組重量（kg）' }), '60')

    await user.click(within(bench).getByRole('button', { name: '刪除動作' }))

    await waitFor(() =>
      expect(screen.queryByRole('region', { name: '槓鈴臥推' })).not.toBeInTheDocument(),
    )
    expect(await screen.findByText('已刪除『槓鈴臥推』')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '復原' }))

    const restored = await screen.findByRole('region', { name: '槓鈴臥推' })
    expect(within(restored).getByRole('textbox', { name: '第 1 組重量（kg）' })).toHaveValue('60')
    reload()
    expect(await screen.findByRole('region', { name: '槓鈴臥推' })).toBeInTheDocument()
  })
})

describe('在過去的日期刪除與復原', () => {
  it('刪除與復原都作用在檢視中的日期，重新整理後仍在該日，今天不受影響', async () => {
    const { user, reload } = renderApp('/day/2026-10-20')
    expect(
      await screen.findByRole('heading', { level: 1, name: '10/20（二）' }),
    ).toBeInTheDocument()
    const bench = await addExercise(user, '槓鈴臥推')
    await user.type(within(bench).getByRole('textbox', { name: '第 1 組重量（kg）' }), '60')

    await user.click(within(bench).getByRole('button', { name: '刪除動作' }))
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: '槓鈴臥推' })).not.toBeInTheDocument(),
    )
    await user.click(await screen.findByRole('button', { name: '復原' }))

    const restored = await screen.findByRole('region', { name: '槓鈴臥推' })
    expect(within(restored).getByRole('textbox', { name: '第 1 組重量（kg）' })).toHaveValue('60')
    reload()
    expect(
      await screen.findByRole('heading', { level: 1, name: '10/20（二）' }),
    ).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: '槓鈴臥推' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '回到今天' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: '10/24（六）' }),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: '槓鈴臥推' })).not.toBeInTheDocument(),
    )
  })
})
