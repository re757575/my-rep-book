import { screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { backupFixture, fixtureWorkout } from '@/test/backupFixture'
import { renderAppWithBackup } from '@/test/importBackup'
import { renderApp } from '@/test/renderApp'

// 固定的今天是 2026-10-24（週六）：本週 10/19（一）– 10/25（日），上週 10/12–10/18，再上週 10/5–10/11

/** 在指定日期各做一次臥推 */
function trainedOn(...dates: string[]) {
  return backupFixture({
    workouts: dates.map((date) =>
      fixtureWorkout(date, [
        {
          exerciseId: 'barbell-bench-press',
          sets: [{ type: 'weight_reps', weightKg: 60, reps: 8 }],
        },
      ]),
    ),
  })
}

async function rhythmRegion() {
  return screen.findByRole('region', { name: '訓練節奏' })
}

/** 訓練節奏的三項：本週已練、連續、最長連續 */
async function rhythmValues() {
  const region = await rhythmRegion()
  return ['本週已練', '連續', '最長連續'].map(
    (name) => within(region).getByRole('definition', { name }).textContent,
  )
}

describe('訓練節奏（US-45）', () => {
  it('本週有練：本週已練天數，連續與最長連續算到本週', async () => {
    await renderAppWithBackup(
      trainedOn('2026-10-06', '2026-10-14', '2026-10-20', '2026-10-22'),
      '/history',
    )

    await waitFor(async () => expect(await rhythmValues()).toEqual(['2 天', '3 週', '3 週']))
    // 本週有練，不顯示提示
    expect(screen.queryByText(/本週還沒練/)).not.toBeInTheDocument()
  })

  it('本週還沒練：連續算到上週，並提示練一天就能延續', async () => {
    await renderAppWithBackup(trainedOn('2026-10-06', '2026-10-14'), '/history')

    await waitFor(async () => expect(await rhythmValues()).toEqual(['0 天', '2 週', '2 週']))
    expect(
      within(await rhythmRegion()).getByText('本週還沒練，練一天就能延續連續 2 週'),
    ).toBeInTheDocument()
  })

  it('中斷之後：目前連續從斷點重算，最長連續保留較早的一段', async () => {
    await renderAppWithBackup(
      trainedOn('2026-09-01', '2026-09-08', '2026-09-15', '2026-09-22', '2026-10-14', '2026-10-22'),
      '/history',
    )

    await waitFor(async () => expect(await rhythmValues()).toEqual(['1 天', '2 週', '4 週']))
  })

  it('本週與上週都沒練：連續是 0，沒有提示', async () => {
    await renderAppWithBackup(trainedOn('2026-09-21', '2026-09-28'), '/history')

    await waitFor(async () => expect(await rhythmValues()).toEqual(['0 天', '0 週', '2 週']))
    expect(screen.queryByText(/本週還沒練/)).not.toBeInTheDocument()
  })

  it('沒有任何訓練時三項都是 0，沒有提示', async () => {
    renderApp('/history')

    expect(await rhythmValues()).toEqual(['0 天', '0 週', '0 週'])
    expect(screen.queryByText(/本週還沒練/)).not.toBeInTheDocument()
  })

  it('一律以今天為準：選取別天、切換月曆的月份都不改變', async () => {
    const { user } = await renderAppWithBackup(
      trainedOn('2026-09-01', '2026-10-14', '2026-10-21'),
      '/history',
    )
    await waitFor(async () => expect(await rhythmValues()).toEqual(['1 天', '2 週', '2 週']))

    await user.click(await screen.findByRole('button', { name: /10月14日/ }))
    await user.click(screen.getByRole('button', { name: '前往上個月' }))

    await screen.findByRole('grid', { name: '2026年9月' })
    expect(await rhythmValues()).toEqual(['1 天', '2 週', '2 週'])
  })

  it('記錄今天的訓練後即時更新', async () => {
    const { user } = renderApp('/')
    await goToTab(user, '歷史')
    expect(await rhythmValues()).toEqual(['0 天', '0 週', '0 週'])

    await goToTab(user, '今天')
    await user.click(await screen.findByRole('button', { name: '加入動作' }))
    const dialog = await screen.findByRole('dialog', { name: '加入動作' })
    const list = await within(dialog).findByRole('list', { name: '動作清單' })
    await user.click(within(list).getByRole('button', { name: /^槓鈴臥推/ }))
    await screen.findByRole('region', { name: '槓鈴臥推' })

    await goToTab(user, '歷史')
    await waitFor(async () => expect(await rhythmValues()).toEqual(['1 天', '1 週', '1 週']))
  })
})

async function goToTab(user: UserEvent, tab: '今天' | '歷史') {
  const tabs = screen.getByRole('navigation', { name: '主要分頁' })
  await user.click(within(tabs).getByRole('link', { name: tab }))
}
