import { describe, expect, it } from 'vitest'
import { DAY_LEVEL_RANGES, dayLevel } from './dayLevel'
import type { SetType, SetValues, Workout } from './types'

const T = '2026-10-01T00:00:00.000Z'
const wr = (weightKg: number | null, reps: number | null): SetValues => ({
  type: 'weight_reps',
  weightKg,
  reps,
})

/** 一個動作、`count` 個已完成的完整正式組 */
function withSets(count: number, extra: { setType?: SetType; done?: boolean }[] = []): Workout {
  return {
    date: '2026-10-20',
    exercises: [
      {
        id: 'we-1',
        exerciseId: 'barbell-bench-press',
        note: '',
        sets: [
          ...Array.from({ length: count }, (_, index) => ({
            id: `s-${index}`,
            setType: 'regular' as const,
            values: wr(60, 8),
          })),
          ...extra.map(({ setType = 'regular', done }, index) => ({
            id: `x-${index}`,
            setType,
            ...(done === undefined ? {} : { done }),
            values: wr(60, 8),
          })),
        ],
      },
    ],
    createdAt: T,
    updatedAt: T,
  }
}

describe('dayLevel：月曆標點的級別（US-48）', () => {
  it.each([
    [1, 'low'],
    [8, 'low'],
    [9, 'medium'],
    [16, 'medium'],
    [17, 'high'],
    [40, 'high'],
  ] as const)('%d 組 → %s', (count, level) => {
    expect(dayLevel(withSets(count))).toBe(level)
  })

  it('級別的範圍寫在 DAY_LEVEL_RANGES：少 1–8、中 9–16、多 17 以上', () => {
    expect(DAY_LEVEL_RANGES).toEqual({ low: [1, 8], medium: [9, 16], high: [17, Infinity] })
  })

  it('沒有任何已完成的完整正式組時是「未完成」', () => {
    expect(dayLevel(withSets(0))).toBe('none')
  })

  it('熱身組、不完整的組與未完成的組（US-44）不計入組數', () => {
    // 8 個正式組 + 熱身 + 未完成 + 已完成：8 + 1（已完成）= 9 → 中；熱身與未完成不算
    const workout = withSets(8, [{ setType: 'warmup' }, { done: false }, { done: true }])
    expect(dayLevel(workout)).toBe('medium')
    const incomplete = withSets(8)
    incomplete.exercises[0].sets.push({
      id: 'inc',
      setType: 'regular',
      values: wr(60, null),
    })
    expect(dayLevel(incomplete)).toBe('low')
  })

  it('只有熱身組或只有未完成的組時是「未完成」', () => {
    expect(dayLevel(withSets(0, [{ setType: 'warmup' }]))).toBe('none')
    expect(dayLevel(withSets(0, [{ done: false }, { done: false }]))).toBe('none')
  })

  it('遞減與力竭算正式組；同一天多個動作的組數相加', () => {
    const workout = withSets(3, [{ setType: 'drop' }, { setType: 'failure' }])
    workout.exercises.push({ ...workout.exercises[0], id: 'we-2' })
    // (3 + 2) × 2 個動作 = 10
    expect(dayLevel(workout)).toBe('medium')
  })
})
