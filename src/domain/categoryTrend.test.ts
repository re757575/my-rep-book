import { describe, expect, it } from 'vitest'
import {
  TREND_WEEKS,
  averageOfCompletedWeeks,
  buildCategoryTrend,
  trendRange,
} from './categoryTrend'
import type { ExerciseBase, SetValues, Workout } from './types'

const T = '2026-10-01T00:00:00.000Z'
// 固定的今天 2026-10-24（週六）；本週 10/19（一）– 10/25（日），上週 10/12，再上週 10/5

const exercises = new Map<string, Pick<ExerciseBase, 'primaryMuscles'>>([
  ['bench', { primaryMuscles: ['chest'] }],
  ['row', { primaryMuscles: ['back'] }],
  ['dip', { primaryMuscles: ['chest', 'triceps'] }],
])

const wr = (weightKg: number | null, reps: number | null): SetValues => ({
  type: 'weight_reps',
  weightKg,
  reps,
})

/** 某一天各動作的組數（都是完整的正式組） */
function day(date: string, items: [exerciseId: string, sets: number][]): Workout {
  return {
    date,
    exercises: items.map(([exerciseId, count], e) => ({
      id: `${date}-${e}`,
      exerciseId,
      note: '',
      sets: Array.from({ length: count }, (_, s) => ({
        id: `${date}-${e}-${s}`,
        setType: 'regular' as const,
        values: wr(60, 8),
      })),
    })),
    createdAt: T,
    updatedAt: T,
  }
}

describe('trendRange：趨勢的區間', () => {
  it('從 N 週前的週一到本週的週日', () => {
    expect(trendRange(12, '2026-10-24')).toEqual(['2026-08-03', '2026-10-25'])
    expect(trendRange(1, '2026-10-24')).toEqual(['2026-10-19', '2026-10-25'])
  })

  it('今天是週一或週日時，本週的範圍一樣是那一週', () => {
    expect(trendRange(2, '2026-10-19')).toEqual(['2026-10-12', '2026-10-25'])
    expect(trendRange(2, '2026-10-25')).toEqual(['2026-10-12', '2026-10-25'])
  })

  it('可選的週數是 12、26、52', () => {
    expect(TREND_WEEKS).toEqual([12, 26, 52])
  })
})

describe('buildCategoryTrend：每週所選部位的正式組數', () => {
  const workouts = [
    day('2026-10-05', [['bench', 3]]),
    day('2026-10-13', [
      ['bench', 4],
      ['row', 5],
    ]),
    day('2026-10-15', [['dip', 2]]),
    day('2026-10-20', [['row', 6]]),
  ]

  it('每週一個點，由舊到新；沒有訓練的週是 0；點的日期是該週的週一', () => {
    const points = buildCategoryTrend(workouts, exercises, 'chest', 4, '2026-10-24')
    expect(points).toEqual([
      { weekStart: '2026-09-28', sets: 0 },
      { weekStart: '2026-10-05', sets: 3 },
      // 10/12 週：臥推 4 組 + 雙槓撐體 2 組（主要部位胸、三頭，各算一次）
      { weekStart: '2026-10-12', sets: 6 },
      { weekStart: '2026-10-19', sets: 0 },
    ])
  })

  it('一個動作屬於多個分類時各算一次', () => {
    const triceps = buildCategoryTrend(workouts, exercises, 'triceps', 2, '2026-10-24')
    expect(triceps.map((point) => point.sets)).toEqual([2, 0])
  })

  it('「全部」是所有正式組，包含動作庫找不到的動作', () => {
    const withUnknown = [...workouts, day('2026-10-21', [['unknown', 7]])]
    const points = buildCategoryTrend(withUnknown, exercises, 'all', 2, '2026-10-24')
    expect(points.map((point) => point.sets)).toEqual([11, 13])
  })

  it('熱身組、未完成與不完整的組不計入', () => {
    const mixed = day('2026-10-20', [['bench', 1]])
    mixed.exercises[0].sets = [
      { id: 'a', setType: 'warmup', values: wr(40, 10) },
      { id: 'b', setType: 'regular', done: false, values: wr(60, 8) },
      { id: 'c', setType: 'regular', values: wr(60, null) },
      { id: 'd', setType: 'regular', done: true, values: wr(60, 8) },
      { id: 'e', setType: 'drop', values: wr(50, 8) },
    ]
    const points = buildCategoryTrend([mixed], exercises, 'chest', 1, '2026-10-24')
    expect(points).toEqual([{ weekStart: '2026-10-19', sets: 2 }])
  })

  it('區間之前與本週之後的訓練不計入；沒有任何訓練時全部是 0', () => {
    const outside = [day('2026-09-01', [['bench', 9]]), day('2026-10-26', [['bench', 9]])]
    const points = buildCategoryTrend(outside, exercises, 'chest', 3, '2026-10-24')
    expect(points.map((point) => point.sets)).toEqual([0, 0, 0])
    expect(buildCategoryTrend([], exercises, 'all', 3, '2026-10-24')).toHaveLength(3)
  })

  it('跨月、跨年也照週計算', () => {
    // 2026-01-07 是週三，本週 1/5（一）；前一週 2025-12-29（一）
    const points = buildCategoryTrend(
      [day('2025-12-31', [['bench', 2]]), day('2026-01-06', [['bench', 3]])],
      exercises,
      'chest',
      2,
      '2026-01-07',
    )
    expect(points).toEqual([
      { weekStart: '2025-12-29', sets: 2 },
      { weekStart: '2026-01-05', sets: 3 },
    ])
  })
})

describe('averageOfCompletedWeeks：不含本週的平均', () => {
  it('取最後一個點（本週）以外的平均', () => {
    const points = [
      { weekStart: '2026-10-05', sets: 4 },
      { weekStart: '2026-10-12', sets: 7 },
      { weekStart: '2026-10-19', sets: 1 },
    ]
    expect(averageOfCompletedWeeks(points)).toBe(5.5)
  })

  it('只有本週一個點時沒有平均', () => {
    expect(averageOfCompletedWeeks([{ weekStart: '2026-10-19', sets: 3 }])).toBeUndefined()
    expect(averageOfCompletedWeeks([])).toBeUndefined()
  })
})
