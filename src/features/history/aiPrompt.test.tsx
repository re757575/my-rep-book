import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { backupFixture, fixtureBodyWeight, fixtureWorkout } from '@/test/backupFixture'
import { renderAppWithBackup } from '@/test/importBackup'
import { renderApp } from '@/test/renderApp'

/** 最近 4 週（9/27–10/24）：10/20 臥推；4 週之前：9/10 深蹲；10/20 體重 72.5 kg，身高 175 cm */
const backup = backupFixture({
  workouts: [
    fixtureWorkout('2026-09-10', [
      { exerciseId: 'barbell-squat', sets: [{ type: 'weight_reps', weightKg: 100, reps: 5 }] },
    ]),
    fixtureWorkout('2026-10-20', [
      {
        exerciseId: 'barbell-bench-press',
        note: '左肩不適',
        sets: [
          { type: 'weight_reps', weightKg: 40, reps: 10, isWarmup: true },
          { type: 'weight_reps', weightKg: 60, reps: 8 },
        ],
      },
    ]),
  ],
  bodyWeights: [fixtureBodyWeight('2026-10-20', 72.5)],
  settings: { weightUnit: 'kg', theme: 'system', heightCm: 175 },
})

/** 從歷史頁點「AI 提示詞」，回傳提示詞的文字框 */
async function openFromHistory(user: UserEvent) {
  await user.click(await screen.findByRole('link', { name: 'AI 提示詞' }))
  await screen.findByRole('heading', { level: 1, name: 'AI 提示詞' })
  return screen.findByRole('textbox', { name: '提示詞' })
}

describe('AI 提示詞', () => {
  it('從歷史頁進入，預設整理最近 4 週的紀錄', async () => {
    const { user } = await renderAppWithBackup(backup, '/history')
    const prompt = await openFromHistory(user)

    const text = (prompt as HTMLTextAreaElement).value
    expect(text).toMatch(
      /^你是一位專業的肌力與體能教練。以下是我在 2026\/9\/27（日）到 2026\/10\/24（六）的健身紀錄/,
    )
    expect(text).toContain('- 身高：175 cm')
    expect(text).toContain('- 槓鈴臥推：熱身 40kg×10、60kg×8\n  - 備註：左肩不適')
    expect(text).toContain('- 2026/10/20（二）：72.5 kg')
    // 4 週之前的訓練不包含
    expect(text).not.toContain('槓鈴深蹲')
    const period = screen.getByRole('radiogroup', { name: '期間' })
    expect(within(period).getByRole('radio', { name: '最近 4 週' })).toBeChecked()
  })

  it('按「複製提示詞」把全文複製到剪貼簿', async () => {
    const { user } = await renderAppWithBackup(backup, '/history/ai-prompt')
    const prompt = await screen.findByRole('textbox', { name: '提示詞' })

    await user.click(screen.getByRole('button', { name: '複製提示詞' }))

    expect(await screen.findByText('已複製，可以貼到 AI 的對話中')).toBeInTheDocument()
    expect(await navigator.clipboard.readText()).toBe((prompt as HTMLTextAreaElement).value)
  })

  it('無法寫入剪貼簿時選取全文，請使用者手動複製', async () => {
    const { user } = await renderAppWithBackup(backup, '/history/ai-prompt')
    const prompt = (await screen.findByRole('textbox', { name: '提示詞' })) as HTMLTextAreaElement
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('NotAllowedError'))

    await user.click(screen.getByRole('button', { name: '複製提示詞' }))

    expect(await screen.findByText('無法自動複製，請長按文字手動複製')).toBeInTheDocument()
    expect([prompt.selectionStart, prompt.selectionEnd]).toEqual([0, prompt.value.length])
  })

  it('改選最近 8 週時包含更早的訓練', async () => {
    const { user } = await renderAppWithBackup(backup, '/history/ai-prompt')
    await screen.findByRole('textbox', { name: '提示詞' })

    await user.click(screen.getByRole('radio', { name: '最近 8 週' }))

    const promptText = () =>
      (screen.getByRole('textbox', { name: '提示詞' }) as HTMLTextAreaElement).value
    await waitFor(() => expect(promptText()).toContain('- 槓鈴深蹲：100kg×5'))
    expect(promptText()).toContain('2026/8/30（日）到 2026/10/24（六）')
  })

  it('期間內沒有紀錄時顯示提示，不能複製', async () => {
    renderApp('/history/ai-prompt')
    expect(await screen.findByText('這段期間沒有紀錄')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '複製提示詞' })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: '提示詞' })).not.toBeInTheDocument()
  })
})
