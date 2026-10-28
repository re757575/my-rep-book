import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { backupFixture, fixtureTemplate, fixtureWorkout } from '@/test/backupFixture'
import { renderAppWithBackup } from '@/test/importBackup'
import { unlockDay } from '@/test/unlockDay'

const wr = (weightKg: number, reps: number) => ({ type: 'weight_reps', weightKg, reps }) as const

/** 今天（10/24）：臥推 60×8（RPE 8）已完成、兩組未完成（其中第一組是下一組）；硬舉 100×5 沒有勾選（不追蹤） */
const planned = backupFixture({
  workouts: [
    fixtureWorkout('2026-10-24', [
      {
        exerciseId: 'barbell-bench-press',
        sets: [
          { ...wr(60, 8), rpe: 8, done: true },
          { ...wr(62.5, 6), done: false },
          { ...wr(65, 5), done: false },
        ],
      },
      { exerciseId: 'deadlift', sets: [wr(100, 5)] },
    ]),
  ],
})

/** 某個動作的第 N 組的完成勾選按鈕 */
function doneButton(card: HTMLElement, setNumber: number) {
  return within(card).getByRole('button', { name: `第 ${setNumber} 組完成` })
}

async function benchCard() {
  return screen.findByRole('region', { name: '槓鈴臥推' })
}

async function summaryValue(name: '正式組數' | '總訓練量') {
  const summary = await screen.findByRole('region', { name: '每日摘要' })
  return within(summary).getByRole('definition', { name }).textContent
}

describe('組的完成勾選（US-44）', () => {
  it('有勾選的組左側是勾選按鈕：已完成的是按下狀態，第一個未完成的是「下一組」；沒有勾選的動作沒有按鈕', async () => {
    await renderAppWithBackup(planned)
    const bench = await benchCard()

    expect(doneButton(bench, 1)).toHaveAttribute('aria-pressed', 'true')
    expect(doneButton(bench, 2)).toHaveAttribute('aria-pressed', 'false')
    expect(doneButton(bench, 3)).toHaveAttribute('aria-pressed', 'false')
    expect(doneButton(bench, 1)).not.toHaveAttribute('aria-current')
    expect(doneButton(bench, 2)).toHaveAttribute('aria-current', 'step')
    expect(doneButton(bench, 3)).not.toHaveAttribute('aria-current')

    const deadlift = await screen.findByRole('region', { name: '硬舉' })
    expect(within(deadlift).queryByRole('button', { name: /完成$/ })).not.toBeInTheDocument()
  })

  it('勾選完成後「下一組」往後移；再點一次取消；重新整理後狀態仍在', async () => {
    const { user, reload } = await renderAppWithBackup(planned)
    const bench = await benchCard()

    await user.click(doneButton(bench, 2))
    await waitFor(() => expect(doneButton(bench, 2)).toHaveAttribute('aria-pressed', 'true'))
    expect(doneButton(bench, 3)).toHaveAttribute('aria-current', 'step')
    expect(doneButton(bench, 2)).not.toHaveAttribute('aria-current')

    reload()
    const reloaded = await benchCard()
    await waitFor(() => expect(doneButton(reloaded, 2)).toHaveAttribute('aria-pressed', 'true'))
    expect(doneButton(reloaded, 3)).toHaveAttribute('aria-pressed', 'false')

    await user.click(doneButton(reloaded, 2))
    await waitFor(() => expect(doneButton(reloaded, 2)).toHaveAttribute('aria-pressed', 'false'))
    expect(doneButton(reloaded, 2)).toHaveAttribute('aria-current', 'step')
  })

  it('改未完成的組的數值不會自動完成，要自己勾選；先輸入再勾選，數值保留', async () => {
    const { user, reload } = await renderAppWithBackup(planned)
    const bench = await benchCard()

    await user.click(within(bench).getByRole('button', { name: '增加第 2 組次數' }))
    await waitFor(() =>
      expect(within(bench).getByRole('textbox', { name: '第 2 組次數' })).toHaveValue('7'),
    )
    expect(doneButton(bench, 2)).toHaveAttribute('aria-pressed', 'false')

    const reps = within(bench).getByRole('textbox', { name: '第 2 組次數' })
    await user.clear(reps)
    await user.type(reps, '5')
    await user.click(doneButton(bench, 2))
    await waitFor(() => expect(doneButton(bench, 2)).toHaveAttribute('aria-pressed', 'true'))

    reload()
    const reloaded = await benchCard()
    await waitFor(() => expect(doneButton(reloaded, 2)).toHaveAttribute('aria-pressed', 'true'))
    expect(within(reloaded).getByRole('textbox', { name: '第 2 組次數' })).toHaveValue('5')
  })

  it('已完成的組不能再異動：欄位唯讀、沒有 −／+ 與刪除，類型與強度停用；取消勾選後恢復', async () => {
    localStorage.setItem('my-rep-book:effort-settings', '{"enabled":true,"scale":"rpe"}')
    const { user } = await renderAppWithBackup(planned)
    const bench = await benchCard()

    // 第 1 組已完成，第 2 組未完成
    expect(within(bench).getByRole('textbox', { name: '第 1 組重量（kg）' })).toHaveAttribute(
      'readonly',
    )
    expect(within(bench).getByRole('textbox', { name: '第 1 組次數' })).toHaveAttribute('readonly')
    expect(
      within(bench).queryByRole('button', { name: /^(增加|減少)第 1 組/ }),
    ).not.toBeInTheDocument()
    expect(within(bench).queryByRole('button', { name: '刪除第 1 組' })).not.toBeInTheDocument()
    expect(within(bench).getByRole('button', { name: '第 1 組類型：正式' })).toBeDisabled()
    expect(within(bench).getByRole('button', { name: '第 1 組 RPE 8' })).toBeDisabled()
    expect(within(bench).getByRole('button', { name: '第 2 組 RPE 8' })).toBeEnabled()
    // 勾選按鈕本身不受影響
    expect(doneButton(bench, 1)).toBeEnabled()

    expect(within(bench).getByRole('textbox', { name: '第 2 組重量（kg）' })).not.toHaveAttribute(
      'readonly',
    )
    expect(within(bench).getByRole('button', { name: '增加第 2 組次數' })).toBeInTheDocument()
    expect(within(bench).getByRole('button', { name: '刪除第 2 組' })).toBeInTheDocument()
    expect(within(bench).getByRole('button', { name: '第 2 組類型：正式' })).toBeEnabled()

    // 唯讀的欄位打字不會改變數值
    await user.type(within(bench).getByRole('textbox', { name: '第 1 組次數' }), '9')
    expect(within(bench).getByRole('textbox', { name: '第 1 組次數' })).toHaveValue('8')

    await user.click(doneButton(bench, 1))

    await waitFor(() =>
      expect(within(bench).getByRole('textbox', { name: '第 1 組次數' })).not.toHaveAttribute(
        'readonly',
      ),
    )
    expect(within(bench).getByRole('button', { name: '增加第 1 組次數' })).toBeInTheDocument()
    expect(within(bench).getByRole('button', { name: '刪除第 1 組' })).toBeInTheDocument()
    expect(within(bench).getByRole('button', { name: '第 1 組類型：正式' })).toBeEnabled()
  })

  it('勾選完成後整列鎖住；沒有勾選的組不受影響', async () => {
    const { user } = await renderAppWithBackup(planned)
    const bench = await benchCard()

    await user.click(doneButton(bench, 2))
    await waitFor(() =>
      expect(within(bench).getByRole('textbox', { name: '第 2 組次數' })).toHaveAttribute(
        'readonly',
      ),
    )

    const deadlift = await screen.findByRole('region', { name: '硬舉' })
    expect(within(deadlift).getByRole('textbox', { name: '第 1 組次數' })).not.toHaveAttribute(
      'readonly',
    )
    expect(within(deadlift).getByRole('button', { name: '刪除第 1 組' })).toBeInTheDocument()
  })

  it('勾選完成時開始組間休息，取消勾選不會', async () => {
    const { user } = await renderAppWithBackup(planned)
    const bench = await benchCard()
    expect(screen.queryByRole('region', { name: '組間休息' })).not.toBeInTheDocument()

    // 取消已完成的第 1 組：不開始
    await user.click(doneButton(bench, 1))
    await waitFor(() => expect(doneButton(bench, 1)).toHaveAttribute('aria-pressed', 'false'))
    expect(screen.queryByRole('region', { name: '組間休息' })).not.toBeInTheDocument()

    await user.click(doneButton(bench, 1))
    expect(
      within(await screen.findByRole('region', { name: '組間休息' })).getByRole('timer'),
    ).toHaveTextContent('1:30')
  })

  it('在有勾選的組後面新增一組，新的組也是未完成；沒有勾選的動作新增的組沒有按鈕', async () => {
    const { user } = await renderAppWithBackup(planned)
    const bench = await benchCard()

    await user.click(within(bench).getByRole('button', { name: '新增一組' }))

    await waitFor(() => expect(doneButton(bench, 4)).toHaveAttribute('aria-pressed', 'false'))
    expect(within(bench).getByRole('textbox', { name: '第 4 組重量（kg）' })).toHaveValue('65')

    const deadlift = await screen.findByRole('region', { name: '硬舉' })
    await user.click(within(deadlift).getByRole('button', { name: '新增一組' }))
    await waitFor(() =>
      expect(within(deadlift).getAllByRole('textbox', { name: /^第 \d+ 組/ })).toHaveLength(4),
    )
    expect(within(deadlift).queryByRole('button', { name: /完成$/ })).not.toBeInTheDocument()
  })

  it('未完成的組不計入每日摘要與動作收合後的總計，勾選後才計入', async () => {
    const { user } = await renderAppWithBackup(planned)
    const bench = await benchCard()

    // 臥推 1 組（60×8）＋硬舉 1 組（100×5）
    await waitFor(async () => expect(await summaryValue('正式組數')).toBe('2'))
    expect(await summaryValue('總訓練量')).toBe('980 kg')

    await user.click(doneButton(bench, 2))

    await waitFor(async () => expect(await summaryValue('正式組數')).toBe('3'))
    expect(await summaryValue('總訓練量')).toBe('1,355 kg')
  })

  it('未完成的組不是上次紀錄：加入動作時的「上次」與預填只看已完成的組', async () => {
    const { user } = await renderAppWithBackup(
      backupFixture({
        workouts: [
          fixtureWorkout('2026-10-20', [
            {
              exerciseId: 'barbell-bench-press',
              sets: [
                { ...wr(60, 8), done: true },
                { ...wr(70, 8), done: false },
              ],
            },
          ]),
        ],
      }),
    )
    await user.click(await screen.findByRole('button', { name: '加入動作' }))
    const dialog = await screen.findByRole('dialog', { name: '加入動作' })
    // 做過的動作會同時出現在「最近使用」與「動作清單」，從清單選
    const list = await within(dialog).findByRole('list', { name: '動作清單' })
    await user.click(within(list).getByRole('button', { name: /^槓鈴臥推/ }))

    const bench = await benchCard()
    expect(await within(bench).findByText('上次（10/20）：60kg×8')).toBeInTheDocument()
    expect(within(bench).getByRole('textbox', { name: '第 1 組重量（kg）' })).toHaveValue('60')
  })

  it('訓練頁鎖定時勾選按鈕停用，仍看得出狀態', async () => {
    const past = backupFixture({
      workouts: [
        fixtureWorkout('2026-10-20', [
          {
            exerciseId: 'barbell-bench-press',
            sets: [
              { ...wr(60, 8), done: true },
              { ...wr(60, 8), done: false },
            ],
          },
        ]),
      ],
    })
    const { user } = await renderAppWithBackup(past, '/day/2026-10-20')
    const bench = await benchCard()

    expect(doneButton(bench, 1)).toBeDisabled()
    expect(doneButton(bench, 1)).toHaveAttribute('aria-pressed', 'true')
    expect(doneButton(bench, 2)).toBeDisabled()
    expect(doneButton(bench, 2)).toHaveAttribute('aria-pressed', 'false')

    await unlockDay(user)
    await waitFor(() => expect(doneButton(bench, 2)).toBeEnabled())
  })

  it('從範本加入的組都是未完成：每個動作有勾選按鈕，第一組是下一組', async () => {
    const { user } = await renderAppWithBackup(
      backupFixture({
        templates: [fixtureTemplate('push', '推日', [['barbell-bench-press', 3]])],
      }),
    )
    await user.click(await screen.findByRole('button', { name: '從範本加入' }))
    const dialog = await screen.findByRole('dialog', { name: '從範本加入' })
    await user.click(await within(dialog).findByRole('button', { name: /^推日/ }))

    const bench = await benchCard()
    await waitFor(() => expect(doneButton(bench, 3)).toBeInTheDocument())
    for (const n of [1, 2, 3]) expect(doneButton(bench, n)).toHaveAttribute('aria-pressed', 'false')
    expect(doneButton(bench, 1)).toHaveAttribute('aria-current', 'step')
    // 還沒做的組不計入摘要
    expect(await summaryValue('正式組數')).toBe('0')
  })
})

describe('歷史與複製', () => {
  const past = backupFixture({
    workouts: [
      fixtureWorkout('2026-10-20', [
        {
          exerciseId: 'barbell-bench-press',
          sets: [{ ...wr(60, 8), done: true }, { ...wr(62.5, 6), done: false }, wr(65, 5)],
        },
        { exerciseId: 'plank', sets: [{ type: 'duration', durationSec: 60, done: false }] },
      ]),
    ],
  })

  async function openDay(user: UserEvent) {
    await user.click(await screen.findByRole('button', { name: /10月20日/ }))
    return screen.findByRole('region', { name: '10/20（二）' })
  }

  it('日明細標示未完成的組，也不計入當天的摘要', async () => {
    const { user } = await renderAppWithBackup(past, '/history')
    const detail = await openDay(user)

    const bench = within(detail).getByRole('article', { name: '槓鈴臥推' })
    const sets = within(within(bench).getByRole('list', { name: '組' })).getAllByRole('listitem')
    expect(sets.map((item) => item.textContent)).toEqual(['60kg×8', '未完成62.5kg×6', '65kg×5'])
    const summary = within(detail).getByRole('region', { name: '每日摘要' })
    expect(within(summary).getByRole('definition', { name: '正式組數' }).textContent).toBe('2')
  })

  it('複製到今天只複製已完成的組，複製出來的組是未完成', async () => {
    const { user } = await renderAppWithBackup(past, '/history')
    const detail = await openDay(user)

    await user.click(await within(detail).findByRole('button', { name: '複製到今天' }))

    const bench = await benchCard()
    await waitFor(() => expect(doneButton(bench, 2)).toBeInTheDocument())
    // 只有已完成的 60×8 與不追蹤的 65×5；未完成的 62.5×6 與只有未完成組的平板支撐都沒有複製
    expect(within(bench).getAllByRole('textbox', { name: /^第 \d+ 組重量/ })).toHaveLength(2)
    expect(within(bench).getByRole('textbox', { name: '第 2 組重量（kg）' })).toHaveValue('65')
    expect(doneButton(bench, 1)).toHaveAttribute('aria-pressed', 'false')
    expect(doneButton(bench, 2)).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('region', { name: '平板支撐' })).not.toBeInTheDocument()
  })
})
