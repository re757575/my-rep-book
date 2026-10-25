import { describe, expect, it } from 'vitest'
import { buildExerciseHistory } from './exerciseHistory'
import type { LocalDate, Workout, WorkoutSet } from './types'

const BENCH = 'barbell-bench-press'
const SQUAT = 'barbell-back-squat'

function set(id: string, weightKg: number, reps: number, isWarmup = false): WorkoutSet {
  return { id, isWarmup, values: { type: 'weight_reps', weightKg, reps } }
}

function workout(
  date: LocalDate,
  exercises: { exerciseId: string; note?: string; sets: WorkoutSet[] }[],
): Workout {
  return {
    date,
    exercises: exercises.map(({ exerciseId, note = '', sets }, index) => ({
      id: `${date}-${index}`,
      exerciseId,
      note,
      sets,
    })),
    createdAt: `${date}T01:00:00.000Z`,
    updatedAt: `${date}T01:00:00.000Z`,
  }
}

describe('buildExerciseHistory：動作歷史', () => {
  it('由新到舊，只取這個動作的組（含熱身組）與備註，略過不含這個動作的訓練', () => {
    const workouts = [
      workout('2026-10-18', [
        { exerciseId: BENCH, note: '左肩不適', sets: [set('a', 40, 10, true), set('b', 60, 8)] },
        { exerciseId: SQUAT, note: '深蹲備註', sets: [set('c', 100, 5)] },
      ]),
      workout('2026-10-22', [{ exerciseId: BENCH, sets: [set('d', 65, 5)] }]),
      workout('2026-10-20', [{ exerciseId: SQUAT, sets: [set('e', 100, 5)] }]),
    ]

    expect(buildExerciseHistory(workouts, BENCH)).toEqual([
      { date: '2026-10-22', sets: [set('d', 65, 5)], notes: [] },
      {
        date: '2026-10-18',
        sets: [set('a', 40, 10, true), set('b', 60, 8)],
        notes: ['左肩不適'],
      },
    ])
  })

  it('同一天加入多次這個動作時合併成一筆，組與備註依動作順序串接，空白備註略過', () => {
    const workouts = [
      workout('2026-10-20', [
        { exerciseId: BENCH, note: '寬握', sets: [set('a', 60, 8)] },
        { exerciseId: SQUAT, sets: [set('b', 100, 5)] },
        { exerciseId: BENCH, note: '  ', sets: [set('c', 50, 12)] },
        { exerciseId: BENCH, note: '窄握', sets: [set('d', 40, 15)] },
      ]),
    ]

    expect(buildExerciseHistory(workouts, BENCH)).toEqual([
      {
        date: '2026-10-20',
        sets: [set('a', 60, 8), set('c', 50, 12), set('d', 40, 15)],
        notes: ['寬握', '窄握'],
      },
    ])
  })

  it('沒有包含這個動作的訓練時為空陣列', () => {
    expect(buildExerciseHistory([], BENCH)).toEqual([])
  })
})
