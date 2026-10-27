import { describe, expect, it } from 'vitest'
import { periodRange, summarizePeriod } from './periodStats'
import type { ExerciseBase, SetValues, Workout } from './types'

const T = '2026-10-01T00:00:00.000Z'

describe('periodRange：包含某天的統計區間', () => {
  it.each<[string, [string, string]]>([
    // 2026-10-24 是週六
    ['2026-10-24', ['2026-10-19', '2026-10-25']],
    ['2026-10-19', ['2026-10-19', '2026-10-25']],
    ['2026-10-25', ['2026-10-19', '2026-10-25']],
    // 跨月、跨年的週
    ['2026-11-01', ['2026-10-26', '2026-11-01']],
    ['2027-01-01', ['2026-12-28', '2027-01-03']],
  ])('週（週一到週日）：%s → %j', (date, expected) => {
    expect(periodRange('week', date)).toEqual(expected)
  })

  it.each<[string, [string, string]]>([
    ['2026-10-24', ['2026-10-01', '2026-10-31']],
    ['2026-11-15', ['2026-11-01', '2026-11-30']],
    ['2026-02-01', ['2026-02-01', '2026-02-28']],
    ['2028-02-29', ['2028-02-01', '2028-02-29']],
    ['2026-12-31', ['2026-12-01', '2026-12-31']],
  ])('月：%s → %j', (date, expected) => {
    expect(periodRange('month', date)).toEqual(expected)
  })
})

type Sets = [values: SetValues, warmup?: 'warmup'][]

function workout(date: string, items: { exerciseId: string; sets: Sets }[]): Workout {
  return {
    date,
    exercises: items.map(({ exerciseId, sets }, e) => ({
      id: `${date}-${e}`,
      exerciseId,
      note: '',
      sets: sets.map(([values, warmup], s) => ({
        id: `${date}-${e}-${s}`,
        setType: warmup === 'warmup' ? 'warmup' : 'regular',
        values,
      })),
    })),
    createdAt: T,
    updatedAt: T,
  }
}

const wr = (weightKg: number | null, reps: number | null): SetValues => ({
  type: 'weight_reps',
  weightKg,
  reps,
})

const exercises = new Map<string, Pick<ExerciseBase, 'primaryMuscles'>>([
  ['bench', { primaryMuscles: ['chest'] }],
  ['squat', { primaryMuscles: ['quads', 'glutes'] }],
  // 主要部位跨兩個分類
  ['clean', { primaryMuscles: ['full_body', 'traps'] }],
  ['run', { primaryMuscles: ['full_body'] }],
])

describe('summarizePeriod：一段期間的訓練統計', () => {
  it('沒有訓練時全部為 0', () => {
    const stats = summarizePeriod([], exercises)
    expect(stats).toMatchObject({ trainingDays: 0, workingSetCount: 0, volumeKg: 0 })
    expect(Object.values(stats.setsByCategory).every((count) => count === 0)).toBe(true)
  })

  it('訓練天數、正式組數與總訓練量；熱身組與不完整的組不計入', () => {
    const stats = summarizePeriod(
      [
        workout('2026-10-20', [
          {
            exerciseId: 'bench',
            sets: [[wr(40, 10), 'warmup'], [wr(60, 8)], [wr(60, null)]],
          },
        ]),
        workout('2026-10-22', [
          { exerciseId: 'squat', sets: [[wr(100, 5)], [wr(100, 5)]] },
          {
            exerciseId: 'run',
            sets: [[{ type: 'distance_duration', distanceKm: 5, durationSec: 1500 }]],
          },
        ]),
      ],
      exercises,
    )
    expect(stats).toMatchObject({ trainingDays: 2, workingSetCount: 4, volumeKg: 480 + 1000 })
  })

  it('各分類的組數依主要部位歸類；跨兩個分類的動作兩邊各算一次', () => {
    const stats = summarizePeriod(
      [
        workout('2026-10-20', [
          { exerciseId: 'bench', sets: [[wr(60, 8)], [wr(60, 8)]] },
          // 同一天再加入一次同一個動作
          { exerciseId: 'bench', sets: [[wr(60, 6)]] },
          { exerciseId: 'squat', sets: [[wr(100, 5)]] },
          { exerciseId: 'clean', sets: [[wr(50, 3)]] },
        ]),
      ],
      exercises,
    )
    expect(stats.setsByCategory).toEqual({
      chest: 3,
      back: 0,
      shoulders: 1,
      biceps: 0,
      triceps: 0,
      quads_glutes: 1,
      hamstrings: 0,
      calves: 0,
      core: 0,
      cardio_full_body: 1,
    })
    // 正式組數每組只算一次
    expect(stats.workingSetCount).toBe(5)
  })

  it('找不到的動作仍計入組數，但不歸入分類', () => {
    const stats = summarizePeriod(
      [workout('2026-10-20', [{ exerciseId: 'unknown', sets: [[wr(60, 8)]] }])],
      exercises,
    )
    expect(stats.workingSetCount).toBe(1)
    expect(Object.values(stats.setsByCategory).every((count) => count === 0)).toBe(true)
  })
})
