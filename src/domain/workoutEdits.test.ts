import { describe, expect, it } from 'vitest'
import { cloneSetForNext } from './workoutEdits'
import type { WorkoutSet } from './types'

describe('cloneSetForNext：新增一組時複製上一組', () => {
  it.each<[string, WorkoutSet]>([
    [
      '正式組的重量×次數',
      { id: 'a', isWarmup: false, values: { type: 'weight_reps', weightKg: 60, reps: 8 } },
    ],
    [
      '熱身組也保留熱身標記',
      { id: 'b', isWarmup: true, values: { type: 'weight_reps', weightKg: 40, reps: 10 } },
    ],
    [
      '不完整的組照樣複製空白欄位',
      { id: 'c', isWarmup: false, values: { type: 'weight_reps', weightKg: 60, reps: null } },
    ],
    [
      '距離＋時間',
      {
        id: 'd',
        isWarmup: false,
        values: { type: 'distance_duration', distanceKm: 5, durationSec: 1500 },
      },
    ],
  ])('%s', (_, previousSet) => {
    const { id: _id, ...expected } = previousSet

    expect(cloneSetForNext(previousSet)).toEqual(expected)
  })
})
