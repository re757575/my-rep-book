import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { backupFixture, fixtureWorkout } from '@/test/backupFixture'
import { renderAppWithBackup } from '@/test/importBackup'
import { renderApp } from '@/test/renderApp'
import { expectSetType, setSetType } from '@/test/setType'

/** 開啟強度記錄；`scale` 是輸入與顯示的方式。偏好存在 localStorage，測試直接寫入（設定頁的操作另有測試） */
function enableEffort(scale: 'rpe' | 'rir' = 'rpe') {
  localStorage.setItem('my-rep-book:effort-settings', JSON.stringify({ enabled: true, scale }))
}

/** 從加入動作選單的全部動作清單加入一個動作，回傳該訓練動作的區塊 */
async function addExercise(user: UserEvent, name: string) {
  await user.click(await screen.findByRole('button', { name: '加入動作' }))
  const dialog = await screen.findByRole('dialog', { name: '加入動作' })
  const list = await within(dialog).findByRole('list', { name: '動作清單' })
  await user.click(await within(list).findByRole('button', { name: new RegExp(`^${name}`) }))
  return screen.findByRole('region', { name })
}

/** 某一組強度的輸入按鈕；找不到時回傳 null */
function effortButton(card: HTMLElement, setNumber: number, label: string) {
  return within(card).queryByRole('button', { name: `第 ${setNumber} 組 ${label}` })
}

describe('組的強度（RPE／RIR）輸入', () => {
  it('預設關閉：訓練頁沒有強度的輸入列', async () => {
    const { user } = renderApp()
    const card = await addExercise(user, '槓鈴臥推')

    expect(within(card).queryByRole('group', { name: '第 1 組強度' })).not.toBeInTheDocument()
  })

  it('在設定頁開啟後，每個正式組有 RPE 6–10 五個按鈕；按一下選取，再按取消，重新整理後仍在', async () => {
    const { user, reload } = renderApp('/settings')
    await user.click(await screen.findByRole('switch', { name: /^每一組可以記錄強度/ }))
    await user.click(
      within(screen.getByRole('navigation', { name: '主要分頁' })).getByRole('link', {
        name: '今天',
      }),
    )
    const card = await addExercise(user, '槓鈴臥推')

    const group = within(card).getByRole('group', { name: '第 1 組強度' })
    expect(
      within(group)
        .getAllByRole('button')
        .map((b) => b.getAttribute('aria-label')),
    ).toEqual([
      '第 1 組 RPE 6',
      '第 1 組 RPE 7',
      '第 1 組 RPE 8',
      '第 1 組 RPE 9',
      '第 1 組 RPE 10',
    ])
    expect(effortButton(card, 1, 'RPE 8')).toHaveAttribute('aria-pressed', 'false')

    await user.click(effortButton(card, 1, 'RPE 8')!)
    await waitFor(() =>
      expect(effortButton(card, 1, 'RPE 8')).toHaveAttribute('aria-pressed', 'true'),
    )
    await user.click(effortButton(card, 1, 'RPE 9')!)
    await waitFor(() =>
      expect(effortButton(card, 1, 'RPE 9')).toHaveAttribute('aria-pressed', 'true'),
    )
    expect(effortButton(card, 1, 'RPE 8')).toHaveAttribute('aria-pressed', 'false')

    reload()
    const reloaded = await screen.findByRole('region', { name: '槓鈴臥推' })
    await waitFor(() =>
      expect(effortButton(reloaded, 1, 'RPE 9')).toHaveAttribute('aria-pressed', 'true'),
    )

    await user.click(effortButton(reloaded, 1, 'RPE 9')!)
    await waitFor(() =>
      expect(effortButton(reloaded, 1, 'RPE 9')).toHaveAttribute('aria-pressed', 'false'),
    )
  })

  it('RIR 模式：按鈕是 RIR 4–0，位置對應同一個 RPE；切回 RPE 後看到同一個值', async () => {
    enableEffort('rir')
    const { user, reload } = renderApp()
    const card = await addExercise(user, '槓鈴臥推')
    const names = within(within(card).getByRole('group', { name: '第 1 組強度' }))
      .getAllByRole('button')
      .map((b) => b.getAttribute('aria-label'))
    expect(names).toEqual([
      '第 1 組 RIR 4',
      '第 1 組 RIR 3',
      '第 1 組 RIR 2',
      '第 1 組 RIR 1',
      '第 1 組 RIR 0',
    ])

    // RIR 2 = RPE 8
    await user.click(effortButton(card, 1, 'RIR 2')!)
    await waitFor(() =>
      expect(effortButton(card, 1, 'RIR 2')).toHaveAttribute('aria-pressed', 'true'),
    )

    // 切回 RPE 再重新整理：儲存的是 RPE，所以同一個按鈕（RPE 8）是選取的
    enableEffort('rpe')
    reload()
    const again = await screen.findByRole('region', { name: '槓鈴臥推' })
    await waitFor(() =>
      expect(effortButton(again, 1, 'RPE 8')).toHaveAttribute('aria-pressed', 'true'),
    )
  })

  it('熱身組沒有強度列，換回正式組後之前記的強度還在；「新增一組」不帶強度', async () => {
    enableEffort()
    const { user } = renderApp()
    const card = await addExercise(user, '槓鈴臥推')
    await user.click(effortButton(card, 1, 'RPE 8')!)
    await waitFor(() =>
      expect(effortButton(card, 1, 'RPE 8')).toHaveAttribute('aria-pressed', 'true'),
    )

    await user.click(within(card).getByRole('button', { name: '新增一組' }))
    await expectSetType(card, 2, '正式')
    expect(effortButton(card, 2, 'RPE 8')).toHaveAttribute('aria-pressed', 'false')

    await setSetType(user, card, 1, '熱身')
    expect(within(card).queryByRole('group', { name: '第 1 組強度' })).not.toBeInTheDocument()

    await setSetType(user, card, 1, '正式')
    expect(effortButton(card, 1, 'RPE 8')).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('強度的顯示', () => {
  const backup = backupFixture({
    workouts: [
      fixtureWorkout('2026-10-20', [
        {
          exerciseId: 'barbell-bench-press',
          sets: [
            { type: 'weight_reps', weightKg: 40, reps: 10, setType: 'warmup' },
            { type: 'weight_reps', weightKg: 60, reps: 8, rpe: 8 },
            { type: 'weight_reps', weightKg: 60, reps: 6 },
          ],
        },
      ]),
    ],
  })

  /** 歷史紀錄（動作詳情）中某一天的各組文字 */
  async function historySets() {
    const entry = await screen.findByRole('article', { name: '2026/10/20（二）' })
    return within(within(entry).getByRole('list', { name: '組' }))
      .getAllByRole('listitem')
      .map((item) => item.textContent)
  }

  it('歷史在有強度的組後面顯示 RPE；沒有強度的組不顯示', async () => {
    await renderAppWithBackup(backup, '/exercises/barbell-bench-press')

    expect(await historySets()).toEqual(['熱身40kg×10', '60kg×8 · RPE 8', '60kg×6'])
  })

  it('RIR 模式顯示 RIR；關閉強度記錄後，已記的強度仍然顯示', async () => {
    localStorage.setItem(
      'my-rep-book:effort-settings',
      JSON.stringify({ enabled: false, scale: 'rir' }),
    )
    await renderAppWithBackup(backup, '/exercises/barbell-bench-press')

    expect(await historySets()).toEqual(['熱身40kg×10', '60kg×8 · RIR 2', '60kg×6'])
  })

  it('鎖定的過去日期：記了強度的組顯示停用的按鈕，沒記的不顯示', async () => {
    enableEffort()
    await renderAppWithBackup(backup, '/day/2026-10-20')
    const card = await screen.findByRole('region', { name: '槓鈴臥推' })

    await waitFor(() =>
      expect(effortButton(card, 2, 'RPE 8')).toHaveAttribute('aria-pressed', 'true'),
    )
    expect(effortButton(card, 2, 'RPE 8')).toBeDisabled()
    // 熱身組與沒記強度的組沒有強度列
    expect(within(card).queryByRole('group', { name: '第 1 組強度' })).not.toBeInTheDocument()
    expect(within(card).queryByRole('group', { name: '第 3 組強度' })).not.toBeInTheDocument()
  })
})
