import { describe, expect, it } from 'vitest'
import type { ExerciseSessionProgress } from './exerciseRecords'
import { buildProgressSeries, formatProgressValue, niceTicks } from './progress'
import { toKg } from './units'

function session(
  date: string,
  weightKg: number,
  oneRepMaxKg: number,
  volumeKg: number,
): ExerciseSessionProgress {
  return {
    date,
    topSet: { weightKg, reps: 8 },
    estimatedOneRepMaxKg: oneRepMaxKg,
    volumeKg,
    isMaxWeightRecord: false,
    isOneRepMaxRecord: false,
  }
}

/** 由新到舊，同 `buildExerciseRecords` 的 sessions */
const sessions = [
  session('2026-10-20', 62.5, 80, 1500),
  session('2026-10-15', 60, 76, 1440),
  session('2026-10-10', 57.5, 72.9, 1200),
]

describe('buildProgressSeries', () => {
  it('由舊到新，依指標取當次的最大重量、估算 1RM 或訓練量', () => {
    expect(buildProgressSeries(sessions, 'maxWeight', 'kg').map((p) => [p.date, p.value])).toEqual([
      ['2026-10-10', 57.5],
      ['2026-10-15', 60],
      ['2026-10-20', 62.5],
    ])
    expect(buildProgressSeries(sessions, 'oneRepMax', 'kg').map((p) => p.value)).toEqual([
      72.9, 76, 80,
    ])
    expect(buildProgressSeries(sessions, 'volume', 'kg').map((p) => p.value)).toEqual([
      1200, 1440, 1500,
    ])
  })

  it('lb 模式的值換算成 lb，原本的 kg 照留', () => {
    const [first] = buildProgressSeries(sessions, 'maxWeight', 'lb')
    expect(first.kg).toBe(57.5)
    expect(first.value).toBeCloseTo(126.76, 1)
    const heavy = buildProgressSeries(
      [session('2026-10-20', toKg(135, 'lb'), 0, 0)],
      'maxWeight',
      'lb',
    )
    expect(heavy[0].value).toBeCloseTo(135, 10)
  })

  it('沒有訓練時是空的', () => {
    expect(buildProgressSeries([], 'maxWeight', 'kg')).toEqual([])
  })
})

describe('formatProgressValue', () => {
  it('最大重量同訓練頁、估算 1RM 到 0.1、訓練量加千分位，lb 固定 1 位小數', () => {
    expect(formatProgressValue('maxWeight', 62.5, 'kg')).toBe('62.5')
    expect(formatProgressValue('oneRepMax', 76.66667, 'kg')).toBe('76.7')
    expect(formatProgressValue('volume', 12345.6, 'kg')).toBe('12,345.6')
    expect(formatProgressValue('maxWeight', toKg(135, 'lb'), 'lb')).toBe('135.0')
  })
})

describe('niceTicks', () => {
  it.each<[number, number, number[]]>([
    [57.5, 62.5, [56, 58, 60, 62, 64]],
    [72.9, 80, [72.5, 75, 77.5, 80]],
    [1200, 1500, [1200, 1300, 1400, 1500]],
    [0, 100, [0, 50, 100]],
    [3, 9, [2, 4, 6, 8, 10]],
  ])('%d～%d → %j', (min, max, expected) => {
    expect(niceTicks(min, max, 4).ticks).toEqual(expected)
  })

  it('刻度涵蓋整個範圍，min／max 是第一個與最後一個刻度', () => {
    const result = niceTicks(72.9, 80, 4)
    expect(result.min).toBeLessThanOrEqual(72.9)
    expect(result.max).toBeGreaterThanOrEqual(80)
    expect([result.min, result.max]).toEqual([result.ticks[0], result.ticks.at(-1)])
  })

  it('小數刻度沒有浮點誤差', () => {
    expect(niceTicks(0.1, 0.5, 5).ticks).toEqual([0.1, 0.2, 0.3, 0.4, 0.5])
  })

  it('所有值相同時，以它為中心上下各留一階', () => {
    const { ticks } = niceTicks(60, 60, 4)
    expect(ticks[0]).toBeLessThan(60)
    expect(ticks.at(-1)).toBeGreaterThan(60)
    expect(ticks.length).toBeGreaterThanOrEqual(3)
  })
})
