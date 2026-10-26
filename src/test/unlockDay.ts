import { screen, waitFor } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { expect } from 'vitest'

/** 非今天的訓練頁預設鎖定：要修改紀錄前先取消「鎖定」（按下狀態的 Toggle） */
export async function unlockDay(user: UserEvent) {
  const lock = await screen.findByRole('button', { name: '鎖定' })
  if (lock.getAttribute('aria-pressed') === 'true') await user.click(lock)
  await waitFor(() => expect(lock).toHaveAttribute('aria-pressed', 'false'))
}
