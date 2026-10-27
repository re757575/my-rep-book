import { screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { backupFixture, fixtureBodyWeight } from '@/test/backupFixture'
import { renderAppWithBackup } from '@/test/importBackup'

/** 10/20 73、10/22 72、10/24 71（今天）；7/1 80（90 天之前）；去年 10/1 82（1 年之前） */
const backup = backupFixture({
  bodyWeights: [
    fixtureBodyWeight('2025-10-01', 82),
    fixtureBodyWeight('2026-07-01', 80),
    fixtureBodyWeight('2026-10-20', 73),
    fixtureBodyWeight('2026-10-22', 72),
    fixtureBodyWeight('2026-10-24', 71),
  ],
})

function chartSection() {
  return screen.findByRole('region', { name: '體重趨勢' })
}

/** 圖上方選取那一筆的 [體重, 日期, 7 日平均] */
function readout(section: HTMLElement) {
  return [...within(section).getByRole('status').children].map((item) => item.textContent)
}

/** 隱藏表格的每一列（不含表頭）：日期、體重、7 日平均 */
function tableRows(section: HTMLElement) {
  return within(within(section).getByRole('table'))
    .getAllByRole('row')
    .slice(1)
    .map((row) => [...row.querySelectorAll('th, td')].map((cell) => cell.textContent))
}

describe('體重趨勢圖', () => {
  it('預設 90 天，顯示最新一筆的體重、日期與 7 日平均，圖下方有圖例', async () => {
    await renderAppWithBackup(backup, '/history/body-weight')
    const section = await chartSection()

    expect(within(section).getByRole('radio', { name: '90 天' })).toBeChecked()
    expect(readout(section)).toEqual(['71 kg', '2026/10/24（六）', '7 日平均 72 kg'])
    const legend = within(section).getByRole('list', { name: '圖例' })
    expect(
      within(legend)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['每日體重', '7 日平均'])
  })

  it('用左右鍵選擇其他筆，Home／End 跳到最早與最新', async () => {
    const { user } = await renderAppWithBackup(backup, '/history/body-weight')
    const section = await chartSection()
    const chart = within(section).getByRole('group', { name: /折線圖，共 3 筆/ })

    chart.focus()
    await user.keyboard('{ArrowLeft}')
    // 10/22 往前 7 天內有 10/20 的 73 與 10/22 的 72
    expect(readout(section)).toEqual(['72 kg', '2026/10/22（四）', '7 日平均 72.5 kg'])
    await user.keyboard('{Home}')
    expect(readout(section)).toEqual(['73 kg', '2026/10/20（二）', '7 日平均 73 kg'])
    await user.keyboard('{End}')
    expect(readout(section)[0]).toBe('71 kg')
  })

  it('切換區間改變畫出的筆數；表格每一筆一列、由舊到新', async () => {
    const { user } = await renderAppWithBackup(backup, '/history/body-weight')
    const section = await chartSection()

    expect(tableRows(section)).toEqual(
      [
        ['2026/10/20（二）', '73 kg', '73 kg'],
        ['2026/10/22（四）', '72 kg', '72.5 kg'],
        ['2026/10/24（六）', '71 kg', '72 kg'],
      ].map((row) => row),
    )
    // 90 天區間是 7/27 起，7/1 的 80 與去年的 82 都不在裡面
    await user.click(within(section).getByRole('radio', { name: '全部' }))
    expect(tableRows(section).map((row) => row[0])).toEqual([
      '2025/10/1（三）',
      '2026/7/1（三）',
      '2026/10/20（二）',
      '2026/10/22（四）',
      '2026/10/24（六）',
    ])
    await user.click(within(section).getByRole('radio', { name: '1 年' }))
    expect(tableRows(section)).toHaveLength(4)
  })

  it('區間內少於 2 筆時不畫圖，顯示提示；換成較長的區間就有圖', async () => {
    const { user } = await renderAppWithBackup(
      backupFixture({
        bodyWeights: [fixtureBodyWeight('2026-01-01', 75), fixtureBodyWeight('2026-10-24', 71)],
      }),
      '/history/body-weight',
    )
    const section = await chartSection()

    expect(await within(section).findByText('這段期間少於 2 筆體重')).toBeInTheDocument()
    expect(within(section).queryByRole('group', { name: /折線圖/ })).not.toBeInTheDocument()

    await user.click(within(section).getByRole('radio', { name: '全部' }))
    expect(within(section).getByRole('group', { name: /折線圖，共 2 筆/ })).toBeInTheDocument()
    expect(within(section).queryByText('這段期間少於 2 筆體重')).not.toBeInTheDocument()
  })

  it('只有 1 筆體重時沒有趨勢圖，清單照常', async () => {
    await renderAppWithBackup(
      backupFixture({ bodyWeights: [fixtureBodyWeight('2026-10-24', 71)] }),
      '/history/body-weight',
    )

    await screen.findByRole('list', { name: '體重紀錄' })
    expect(screen.queryByRole('region', { name: '體重趨勢' })).not.toBeInTheDocument()
  })

  it('以目前的重量單位顯示', async () => {
    await renderAppWithBackup(
      backupFixture({
        bodyWeights: backup.data.bodyWeights,
        settings: { weightUnit: 'lb' },
      }),
      '/history/body-weight',
    )
    const section = await chartSection()

    // 71 kg = 156.5 lb；7 日平均 72 kg = 158.7 lb
    await waitFor(() =>
      expect(readout(section)).toEqual(['156.5 lb', '2026/10/24（六）', '7 日平均 158.7 lb']),
    )
    expect(within(section).getByRole('group', { name: /^體重（lb）/ })).toBeInTheDocument()
  })
})
