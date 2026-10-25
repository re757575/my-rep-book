import { describe, expect, it } from 'vitest'
import { buildInitialSet, findLastPerformance } from './lastPerformance'
import type { LocalDate, SetValues, Workout, WorkoutSet } from './types'

const BENCH = 'barbell-bench-press'
const SQUAT = 'barbell-back-squat'

function weightReps(weightKg: number | null, reps: number | null): SetValues {
  return { type: 'weight_reps', weightKg, reps }
}

let nextId = 0
function set(values: SetValues, isWarmup = false): WorkoutSet {
  nextId += 1
  return { id: `set-${nextId}`, isWarmup, values }
}

function workout(date: LocalDate, exercises: [string, WorkoutSet[]][]): Workout {
  return {
    date,
    exercises: exercises.map(([exerciseId, sets], index) => ({
      id: `${date}-${index}`,
      exerciseId,
      note: '',
      sets,
    })),
    createdAt: `${date}T01:00:00.000Z`,
    updatedAt: `${date}T01:00:00.000Z`,
  }
}

describe('findLastPerformance：上次紀錄', () => {
  it('排除熱身組，只列出完整的正式組', () => {
    const workouts = [
      workout('2026-10-20', [
        [
          BENCH,
          [
            set(weightReps(40, 10), true),
            set(weightReps(60, 8)),
            set(weightReps(60, 8)),
            set(weightReps(62.5, 6)),
          ],
        ],
      ]),
    ]

    expect(findLastPerformance(workouts, BENCH, '2026-10-24')).toEqual({
      date: '2026-10-20',
      sets: [weightReps(60, 8), weightReps(60, 8), weightReps(62.5, 6)],
    })
  })

  it.each<[string, SetValues]>([
    ['重量沒填', weightReps(null, 8)],
    ['次數沒填', weightReps(60, null)],
    ['次數不合法', weightReps(60, 0)],
    ['重量為負數', weightReps(-5, 8)],
    ['時間沒填', { type: 'duration', durationSec: null }],
    ['距離＋時間只填距離', { type: 'distance_duration', distanceKm: 5, durationSec: null }],
  ])('排除不完整的組：%s', (_, incomplete) => {
    const complete = weightReps(60, 8)
    const workouts = [workout('2026-10-20', [[BENCH, [set(incomplete), set(complete)]]])]

    expect(findLastPerformance(workouts, BENCH, '2026-10-24')?.sets).toEqual([complete])
  })

  // 10/12 與 10/20 做過臥推，10/22 只做了深蹲，10/24（當天）也做了臥推；順序故意打亂
  const history = [
    workout('2026-10-20', [[BENCH, [set(weightReps(60, 8))]]]),
    workout('2026-10-24', [[BENCH, [set(weightReps(70, 5))]]]),
    workout('2026-10-12', [[BENCH, [set(weightReps(55, 10))]]]),
    workout('2026-10-22', [[SQUAT, [set(weightReps(100, 5))]]]),
  ]

  it.each<[string, LocalDate, LocalDate | undefined]>([
    ['取早於檢視日期、最近一筆包含這個動作的訓練', '2026-10-24', '2026-10-20'],
    ['排除檢視日期當天的紀錄', '2026-10-24', '2026-10-20'],
    ['補記 10/15 時取 10/12，而不是 10/20', '2026-10-15', '2026-10-12'],
    ['檢視日期之後的紀錄不列入', '2026-10-21', '2026-10-20'],
    ['檢視日期之前沒有這個動作時，沒有上次紀錄', '2026-10-12', undefined],
    ['檢視未來日期也只看之前的紀錄', '2026-10-30', '2026-10-24'],
  ])('%s', (_, beforeDate, expectedDate) => {
    expect(findLastPerformance(history, BENCH, beforeDate)?.date).toBe(expectedDate)
  })

  it('從沒做過的動作沒有上次紀錄', () => {
    expect(findLastPerformance(history, 'deadlift', '2026-10-24')).toBeUndefined()
    expect(findLastPerformance([], BENCH, '2026-10-24')).toBeUndefined()
  })

  it('同一天加入兩次同一個動作時，依序列出兩者的正式組', () => {
    const workouts = [
      workout('2026-10-20', [
        [BENCH, [set(weightReps(60, 8))]],
        [SQUAT, [set(weightReps(100, 5))]],
        [BENCH, [set(weightReps(50, 12))]],
      ]),
    ]

    expect(findLastPerformance(workouts, BENCH, '2026-10-24')?.sets).toEqual([
      weightReps(60, 8),
      weightReps(50, 12),
    ])
  })

  it('最近一筆包含這個動作的訓練沒有完整的正式組時，沒有上次紀錄，也不再往前找', () => {
    const workouts = [
      workout('2026-10-12', [[BENCH, [set(weightReps(55, 10))]]]),
      workout('2026-10-20', [[BENCH, [set(weightReps(40, 10), true), set(weightReps(60, null))]]]),
    ]

    expect(findLastPerformance(workouts, BENCH, '2026-10-24')).toBeUndefined()
  })
})

describe('buildInitialSet：第一組預填', () => {
  const lastPerformance = {
    date: '2026-10-20',
    sets: [weightReps(60, 8), weightReps(62.5, 6)],
  }

  it('帶入上次紀錄中第一個完整的正式組，而且是正式組', () => {
    expect(buildInitialSet(lastPerformance, 'weight_reps')).toEqual({
      isWarmup: false,
      values: weightReps(60, 8),
    })
  })

  it.each([
    ['weight_reps', weightReps(null, null)],
    ['reps', { type: 'reps', reps: null, addedWeightKg: null }],
    ['duration', { type: 'duration', durationSec: null }],
    ['distance_duration', { type: 'distance_duration', distanceKm: null, durationSec: null }],
  ] as const)('沒有上次紀錄時，%s 的所有欄位為空白', (trackingType, empty) => {
    expect(buildInitialSet(undefined, trackingType)).toEqual({ isWarmup: false, values: empty })
  })

  it('上次紀錄的記錄類型和動作不同時，欄位為空白', () => {
    expect(buildInitialSet(lastPerformance, 'reps')).toEqual({
      isWarmup: false,
      values: { type: 'reps', reps: null, addedWeightKg: null },
    })
  })
})
