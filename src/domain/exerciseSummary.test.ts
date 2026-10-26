import { describe, expect, it } from 'vitest'
import { formatWorkoutExerciseSummary } from './exerciseSummary'
import type { SetValues, WorkoutSet } from './types'

function sets(items: (SetValues & { isWarmup?: boolean })[]): WorkoutSet[] {
  return items.map(({ isWarmup = false, ...values }, index) => ({
    id: `s-${index}`,
    isWarmup,
    values: values as SetValues,
  }))
}

describe('formatWorkoutExerciseSummary：收合時顯示的訓練動作總計', () => {
  it('重量×次數：組數、最重的一組與訓練量；熱身組與不完整的組不計入', () => {
    const summary = formatWorkoutExerciseSummary(
      sets([
        { type: 'weight_reps', weightKg: 40, reps: 10, isWarmup: true },
        { type: 'weight_reps', weightKg: 60, reps: 8 },
        { type: 'weight_reps', weightKg: 62.5, reps: 6 },
        { type: 'weight_reps', weightKg: 62.5, reps: 5 },
        { type: 'weight_reps', weightKg: 60, reps: null },
      ]),
      'kg',
    )
    expect(summary).toBe('3 組 · 最重 62.5kg×6 · 訓練量 1,167.5 kg')
  })

  it('重量以目前的重量單位顯示', () => {
    const summary = formatWorkoutExerciseSummary(
      sets([{ type: 'weight_reps', weightKg: 60, reps: 8 }]),
      'lb',
    )
    expect(summary).toBe('1 組 · 最重 132.3lb×8 · 訓練量 1,058.2 lb')
  })

  it('次數：組數與總次數', () => {
    const summary = formatWorkoutExerciseSummary(
      sets([
        { type: 'reps', reps: 10, addedWeightKg: null },
        { type: 'reps', reps: 8, addedWeightKg: 10 },
        { type: 'reps', reps: 6, addedWeightKg: 10 },
      ]),
      'kg',
    )
    expect(summary).toBe('3 組 · 共 24 下')
  })

  it('時間：組數與總時間', () => {
    const summary = formatWorkoutExerciseSummary(
      sets([
        { type: 'duration', durationSec: 90 },
        { type: 'duration', durationSec: 90 },
      ]),
      'kg',
    )
    expect(summary).toBe('2 組 · 共 03:00')
  })

  it('距離＋時間：組數、總距離與總時間', () => {
    const summary = formatWorkoutExerciseSummary(
      sets([
        { type: 'distance_duration', distanceKm: 2.5, durationSec: 900 },
        { type: 'distance_duration', distanceKm: 1.25, durationSec: 450 },
      ]),
      'kg',
    )
    expect(summary).toBe('2 組 · 3.75 km · 22:30')
  })

  it('沒有任何完整的正式組時', () => {
    expect(formatWorkoutExerciseSummary([], 'kg')).toBe('尚未記錄正式組')
    expect(
      formatWorkoutExerciseSummary(
        sets([
          { type: 'weight_reps', weightKg: 40, reps: 10, isWarmup: true },
          { type: 'weight_reps', weightKg: null, reps: null },
        ]),
        'kg',
      ),
    ).toBe('尚未記錄正式組')
  })
})
