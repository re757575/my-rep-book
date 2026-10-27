import { screen } from '@testing-library/react'
import { describe, it } from 'vitest'
import { renderApp } from '@/test/renderApp'
import { expectSetType } from '@/test/setType'
import { seedV1Database } from '@/test/seedV1Database'

describe('從舊版資料庫升級（組是 isWarmup）', () => {
  it('開啟時把 isWarmup 轉成組類型：標為熱身的組是熱身，其他是正式', async () => {
    // 模擬已經在用的 App 更新到新版：資料庫裡的組還是 isWarmup: boolean
    const values = { type: 'weight_reps', weightKg: 60, reps: 8 }
    await seedV1Database({
      workouts: [
        {
          date: '2026-10-24',
          exercises: [
            {
              id: 'we-1',
              exerciseId: 'barbell-bench-press',
              note: '',
              sets: [
                { id: 's-1', isWarmup: true, values },
                { id: 's-2', isWarmup: false, values },
                { id: 's-3', isWarmup: false, values },
              ],
            },
          ],
          exerciseIds: ['barbell-bench-press'],
          createdAt: '2026-10-24T01:00:00.000Z',
          updatedAt: '2026-10-24T01:00:00.000Z',
        },
      ],
    })

    renderApp()

    const card = await screen.findByRole('region', { name: '槓鈴臥推' })
    await expectSetType(card, 1, '熱身')
    await expectSetType(card, 2, '正式')
    await expectSetType(card, 3, '正式')
  })
})
