import { describe, expect, it } from 'vitest'
import { isDoneSet, isFinishedSet } from './setDone'
import { summarizeWorkout } from './summary'
import { findLastPerformance } from './lastPerformance'
import { buildExerciseRecords } from './exerciseRecords'
import { formatWorkoutExerciseSummary } from './exerciseSummary'
import { summarizePeriod } from './periodStats'
import { buildTrainingPrompt } from './trainingPrompt'
import type { SetValues, Workout, WorkoutSet } from './types'

const T = '2026-10-01T00:00:00.000Z'
const wr = (weightKg: number | null, reps: number | null): SetValues => ({
  type: 'weight_reps',
  weightKg,
  reps,
})

describe('isDoneSet／isFinishedSet', () => {
  it('沒有 done（不追蹤）與 done 為 true 都算；只有 done 為 false 是未完成', () => {
    expect(isDoneSet({})).toBe(true)
    expect(isDoneSet({ done: true })).toBe(true)
    expect(isDoneSet({ done: false })).toBe(false)
  })

  it('已完成的完整組：要同時已完成、欄位完整', () => {
    expect(isFinishedSet({ values: wr(60, 8) })).toBe(true)
    expect(isFinishedSet({ done: true, values: wr(60, 8) })).toBe(true)
    expect(isFinishedSet({ done: false, values: wr(60, 8) })).toBe(false)
    expect(isFinishedSet({ done: true, values: wr(60, null) })).toBe(false)
  })
})

describe('未完成的組不計入任何摘要、統計與紀錄', () => {
  const sets = (items: [id: string, weightKg: number, done: boolean | undefined][]): WorkoutSet[] =>
    items.map(([id, weightKg, done]) => ({
      id,
      setType: 'regular',
      ...(done === undefined ? {} : { done }),
      values: wr(weightKg, 8),
    }))

  /** 60×8（不追蹤）、70×8（已完成）、100×8（未完成） */
  const workout = (date: string): Workout => ({
    date,
    exercises: [
      {
        id: `${date}-1`,
        exerciseId: 'barbell-bench-press',
        note: '',
        sets: sets([
          ['a', 60, undefined],
          ['b', 70, true],
          ['c', 100, false],
        ]),
      },
    ],
    createdAt: T,
    updatedAt: T,
  })

  it('每日摘要：組數與訓練量只算已完成的組', () => {
    expect(summarizeWorkout(workout('2026-10-20'))).toMatchObject({
      workingSetCount: 2,
      volumeKg: 60 * 8 + 70 * 8,
    })
  })

  it('動作收合後的總計', () => {
    expect(formatWorkoutExerciseSummary(workout('2026-10-20').exercises[0].sets, 'kg')).toContain(
      '2 組',
    )
  })

  it('上次紀錄只列出已完成的組；全部未完成的訓練沒有上次紀錄', () => {
    expect(
      findLastPerformance([workout('2026-10-20')], 'barbell-bench-press', '2026-10-24'),
    ).toEqual({ date: '2026-10-20', sets: [wr(60, 8), wr(70, 8)] })

    const allPlanned = workout('2026-10-20')
    allPlanned.exercises[0].sets = sets([['a', 60, false]])
    expect(findLastPerformance([allPlanned], 'barbell-bench-press', '2026-10-24')).toBeUndefined()
  })

  it('個人紀錄與每次的進度', () => {
    const records = buildExerciseRecords([workout('2026-10-20')], 'barbell-bench-press')
    expect(records?.maxWeight.set).toEqual({ weightKg: 70, reps: 8 })
    expect(records?.sessions[0].volumeKg).toBe(60 * 8 + 70 * 8)
  })

  it('每週／每月統計', () => {
    const stats = summarizePeriod(
      [workout('2026-10-20')],
      new Map([['barbell-bench-press', { nameZh: '槓鈴臥推', primaryMuscles: ['chest'] }]]),
    )
    expect(stats.workingSetCount).toBe(2)
    expect(stats.setsByCategory.chest).toBe(2)
  })

  it('AI 提示詞的訓練明細', () => {
    const prompt = buildTrainingPrompt({
      from: '2026-10-19',
      to: '2026-10-25',
      weightUnit: 'kg',
      heightCm: null,
      birthDate: null,
      workouts: [workout('2026-10-20')],
      exercises: new Map([
        ['barbell-bench-press', { nameZh: '槓鈴臥推', primaryMuscles: ['chest'] }],
      ]),
      bodyWeights: [],
      records: new Map(),
    })
    expect(prompt).toContain('- 槓鈴臥推：60kg×8、70kg×8\n')
    expect(prompt).not.toContain('100kg')
  })
})
