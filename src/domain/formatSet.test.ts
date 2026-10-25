import { describe, expect, it } from 'vitest'
import { formatLastPerformance, formatSetValues } from './formatSet'
import type { SetValues } from './types'

describe('formatSetValues：一組數值的簡短顯示', () => {
  it.each<[SetValues, string]>([
    [{ type: 'weight_reps', weightKg: 60, reps: 8 }, '60kg×8'],
    [{ type: 'weight_reps', weightKg: 62.5, reps: 6 }, '62.5kg×6'],
    [{ type: 'weight_reps', weightKg: 0, reps: 12 }, '0kg×12'],
    [{ type: 'reps', reps: 12, addedWeightKg: null }, '12下'],
    [{ type: 'reps', reps: 8, addedWeightKg: 0 }, '8下'],
    [{ type: 'reps', reps: 8, addedWeightKg: 10 }, '8下＋10kg'],
    [{ type: 'duration', durationSec: 90 }, '01:30'],
    [{ type: 'distance_duration', distanceKm: 5, durationSec: 1500 }, '5km 25:00'],
    [{ type: 'distance_duration', distanceKm: 0.75, durationSec: 300 }, '0.75km 05:00'],
  ])('%j → %s', (values, expected) => {
    expect(formatSetValues(values)).toBe(expected)
  })
})

describe('formatLastPerformance：動作標題下方的「上次」', () => {
  it('顯示日期 M/D 與各組數值，以頓號分隔', () => {
    expect(
      formatLastPerformance({
        date: '2026-10-20',
        sets: [
          { type: 'weight_reps', weightKg: 60, reps: 8 },
          { type: 'weight_reps', weightKg: 60, reps: 8 },
          { type: 'weight_reps', weightKg: 62.5, reps: 6 },
        ],
      }),
    ).toBe('上次（10/20）：60kg×8、60kg×8、62.5kg×6')
  })

  it('日期不補零', () => {
    expect(
      formatLastPerformance({ date: '2026-01-05', sets: [{ type: 'duration', durationSec: 45 }] }),
    ).toBe('上次（1/5）：00:45')
  })
})
