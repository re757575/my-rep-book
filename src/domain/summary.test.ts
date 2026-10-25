import { describe, expect, it } from 'vitest'
import { summarizeWorkout } from './summary'
import type { SetValues, Workout, WorkoutSet } from './types'

const BENCH = 'barbell-bench-press'
const SQUAT = 'barbell-back-squat'

const weightReps = (weightKg: number | null, reps: number | null): SetValues => ({
  type: 'weight_reps',
  weightKg,
  reps,
})
const reps = (count: number | null, addedWeightKg: number | null = null): SetValues => ({
  type: 'reps',
  reps: count,
  addedWeightKg,
})
const duration = (durationSec: number | null): SetValues => ({ type: 'duration', durationSec })
const distanceDuration = (distanceKm: number | null, durationSec: number | null): SetValues => ({
  type: 'distance_duration',
  distanceKm,
  durationSec,
})

let nextId = 0
function set(values: SetValues, isWarmup = false): WorkoutSet {
  nextId += 1
  return { id: `set-${nextId}`, isWarmup, values }
}

function workout(exercises: [string, WorkoutSet[]][]): Workout {
  return {
    date: '2026-10-24',
    exercises: exercises.map(([exerciseId, sets], index) => ({
      id: `exercise-${index}`,
      exerciseId,
      note: '',
      sets,
    })),
    createdAt: '2026-10-24T01:00:00.000Z',
    updatedAt: '2026-10-24T01:00:00.000Z',
  }
}

describe('summarizeWorkout：每日摘要', () => {
  it('動作數：訓練中的動作數量', () => {
    const summary = summarizeWorkout(
      workout([
        [BENCH, [set({ type: 'weight_reps', weightKg: 60, reps: 8 })]],
        [SQUAT, [set({ type: 'weight_reps', weightKg: 100, reps: 5 })]],
      ]),
    )

    expect(summary.exerciseCount).toBe(2)
  })

  it('動作數：同一個動作加入兩次只算一個動作', () => {
    const summary = summarizeWorkout(
      workout([
        [BENCH, [set({ type: 'weight_reps', weightKg: 60, reps: 8 })]],
        [SQUAT, [set({ type: 'weight_reps', weightKg: 100, reps: 5 })]],
        [BENCH, [set({ type: 'weight_reps', weightKg: 50, reps: 12 })]],
      ]),
    )

    expect(summary.exerciseCount).toBe(2)
  })

  it.each<[string, WorkoutSet[], number]>([
    ['沒有任何組', [], 0],
    [
      '所有記錄類型的完整正式組都算',
      [set(weightReps(60, 8)), set(reps(12)), set(duration(90)), set(distanceDuration(5, 1500))],
      4,
    ],
    ['熱身組不算', [set(weightReps(40, 10), true), set(weightReps(60, 8))], 1],
    [
      '不完整的組不算',
      [
        set(weightReps(null, 8)),
        set(weightReps(60, 0)),
        set(reps(null, 10)),
        set(duration(null)),
        set(distanceDuration(5, null)),
        set(weightReps(60, 8)),
      ],
      1,
    ],
    ['reps 類型沒填額外負重仍是完整的組', [set(reps(12, null))], 1],
  ])('正式組數：%s', (_, sets, expected) => {
    expect(summarizeWorkout(workout([[BENCH, sets]])).workingSetCount).toBe(expected)
  })

  it.each<[string, WorkoutSet[], number]>([
    ['沒有任何組', [], 0],
    ['weight_reps 加總每組的重量 × 次數', [set(weightReps(60, 8)), set(weightReps(62.5, 6))], 855],
    ['熱身組不計入', [set(weightReps(40, 10), true), set(weightReps(60, 8))], 480],
    [
      '不完整的組不計入',
      [set(weightReps(60, null)), set(weightReps(null, 8)), set(weightReps(-5, 8))],
      0,
    ],
    ['reps 類型的額外負重不計入', [set(reps(8, 10)), set(reps(12))], 0],
    [
      'duration 與 distance_duration 不計入',
      [set(duration(90)), set(distanceDuration(5, 1500))],
      0,
    ],
    ['重量為 0 的完整的組訓練量是 0', [set(weightReps(0, 12))], 0],
  ])('總訓練量：%s', (_, sets, expected) => {
    expect(summarizeWorkout(workout([[BENCH, sets]])).volumeKg).toBe(expected)
  })

  it('總訓練量：加總所有動作', () => {
    const summary = summarizeWorkout(
      workout([
        [BENCH, [set(weightReps(60, 8))]],
        [SQUAT, [set(weightReps(100, 5)), set(weightReps(100, 5))]],
      ]),
    )

    expect(summary.volumeKg).toBe(1480)
  })

  it.each<[string, WorkoutSet[], number]>([
    ['沒有任何組', [], 0],
    [
      'distance_duration 加總每組的時間',
      [set(distanceDuration(5, 1500)), set(distanceDuration(0.5, 150))],
      1650,
    ],
    ['duration 類型不計入', [set(duration(90)), set(distanceDuration(5, 1500))], 1500],
    ['熱身組不計入', [set(distanceDuration(1, 600), true), set(distanceDuration(5, 1500))], 1500],
    ['不完整的組不計入', [set(distanceDuration(null, 600)), set(distanceDuration(5, null))], 0],
    ['其他記錄類型不計入', [set(weightReps(60, 8)), set(reps(12))], 0],
  ])('有氧總時間：%s', (_, sets, expected) => {
    expect(summarizeWorkout(workout([['treadmill', sets]])).cardioDurationSec).toBe(expected)
  })

  it('各種記錄類型、熱身組與不完整的組混合', () => {
    const summary = summarizeWorkout(
      workout([
        [BENCH, [set(weightReps(40, 10), true), set(weightReps(60, 8)), set(weightReps(60, null))]],
        ['pull-up', [set(reps(10, 5)), set(reps(null))]],
        ['plank', [set(duration(60)), set(duration(45), true)]],
        ['treadmill', [set(distanceDuration(3, 1200)), set(distanceDuration(null, 300))]],
      ]),
    )

    expect(summary).toEqual({
      exerciseCount: 4,
      workingSetCount: 4,
      volumeKg: 480,
      cardioDurationSec: 1200,
    })
  })
})
