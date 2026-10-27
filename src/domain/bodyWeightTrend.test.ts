import { describe, expect, it } from 'vitest'
import { buildBodyWeightChart, buildBodyWeightTrend } from './bodyWeightTrend'
import type { BodyWeightEntry } from './types'

const T = '2026-10-01T00:00:00.000Z'
const entry = (date: string, weightKg: number): BodyWeightEntry => ({
  date,
  weightKg,
  updatedAt: T,
})

/** 每一筆的 [日期, 7 日平均, 比上週增減] */
function trend(entries: BodyWeightEntry[]) {
  return buildBodyWeightTrend(entries).map((item) => [
    item.date,
    item.averageKg,
    item.changeFromLastWeekKg,
  ])
}

describe('buildBodyWeightTrend：7 日平均與比上週增減', () => {
  it('沒有體重時為空', () => {
    expect(buildBodyWeightTrend([])).toEqual([])
  })

  it('只有一筆：平均就是它本身，沒有上週可比', () => {
    expect(trend([entry('2026-10-24', 72)])).toEqual([['2026-10-24', 72, null]])
  })

  it('平均取這天往前 7 天內（含當天）有記的體重，沒記的日子不計入', () => {
    const [latest] = buildBodyWeightTrend([
      entry('2026-10-24', 72),
      entry('2026-10-22', 73),
      entry('2026-10-18', 74),
      // 第 8 天前，不在區間內
      entry('2026-10-17', 90),
    ])
    expect(latest.averageKg).toBeCloseTo(73, 10)
  })

  it('比上週增減：這筆的 7 日平均減去 7 天前的 7 日平均', () => {
    const result = buildBodyWeightTrend([
      entry('2026-10-24', 71),
      entry('2026-10-20', 72),
      // 上一週：10/11–10/17
      entry('2026-10-17', 73),
      entry('2026-10-12', 74),
    ])
    // 本週 (71+72)/2 = 71.5；上週 (73+74)/2 = 73.5
    expect(result[0].averageKg).toBeCloseTo(71.5, 10)
    expect(result[0].changeFromLastWeekKg).toBeCloseTo(-2, 10)
  })

  it('上一週的區間沒有任何體重時不比較', () => {
    const result = buildBodyWeightTrend([entry('2026-10-24', 71), entry('2026-10-10', 74)])
    // 10/24 的上一週是 10/11–10/17，沒有紀錄；10/10 不在區間內
    expect(result[0].changeFromLastWeekKg).toBeNull()
  })

  it('順序同輸入，每一筆各自計算', () => {
    expect(
      trend([entry('2026-10-24', 72), entry('2026-10-17', 73), entry('2026-10-10', 75)]),
    ).toEqual([
      ['2026-10-24', 72, -1],
      ['2026-10-17', 73, -2],
      ['2026-10-10', 75, null],
    ])
  })

  it('跨月與跨年的區間照樣以日曆天計算', () => {
    const result = buildBodyWeightTrend([entry('2027-01-02', 70), entry('2026-12-28', 72)])
    // 2027-01-02 往前 7 天是 12/27–1/2
    expect(result[0].averageKg).toBeCloseTo(71, 10)
  })
})

describe('buildBodyWeightChart：趨勢圖區間內的點', () => {
  const entries = [
    entry('2026-10-24', 72),
    entry('2026-10-20', 73),
    entry('2026-09-25', 74), // 29 天前：30 天區間的第一天
    entry('2026-09-24', 75), // 30 天前：不在 30 天區間
    entry('2026-07-27', 76), // 89 天前：90 天區間的第一天
    entry('2026-07-26', 77), // 90 天前：不在 90 天區間
    entry('2025-10-25', 80), // 364 天前：1 年區間的第一天
    entry('2025-10-24', 81), // 365 天前：不在 1 年區間
  ]

  const dates = (range: Parameters<typeof buildBodyWeightChart>[1]) =>
    buildBodyWeightChart(entries, range, '2026-10-24').map((item) => item.date)

  it('由舊到新，區間從今天往前算（含今天）', () => {
    expect(dates('30d')).toEqual(['2026-09-25', '2026-10-20', '2026-10-24'])
    expect(dates('90d')).toEqual([
      '2026-07-27',
      '2026-09-24',
      '2026-09-25',
      '2026-10-20',
      '2026-10-24',
    ])
    expect(dates('1y')).toEqual([
      '2025-10-25',
      '2026-07-26',
      '2026-07-27',
      '2026-09-24',
      '2026-09-25',
      '2026-10-20',
      '2026-10-24',
    ])
    expect(dates('all')).toHaveLength(8)
    expect(dates('all')[0]).toBe('2025-10-24')
  })

  it('7 日平均以全部體重計算，不因切換區間而改變', () => {
    const [first] = buildBodyWeightChart(entries, '30d', '2026-10-24')
    const full = buildBodyWeightChart(entries, 'all', '2026-10-24').find(
      (item) => item.date === first.date,
    )
    expect(first.averageKg).toBe(full?.averageKg)
    // 區間第一天 9/25 往前 7 天內有區間之前的 9/24（75）與 9/25（74）
    expect(first.averageKg).toBe(74.5)
  })

  it('不需事先排序，區間內沒有體重時是空的；未來的體重不算', () => {
    expect(buildBodyWeightChart([], '90d', '2026-10-24')).toEqual([])
    expect(buildBodyWeightChart([entry('2026-01-01', 70)], '30d', '2026-10-24')).toEqual([])
    expect(buildBodyWeightChart([entry('2026-10-30', 70)], '30d', '2026-10-24')).toEqual([])
  })
})
