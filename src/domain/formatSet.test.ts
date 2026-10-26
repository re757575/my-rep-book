import { describe, expect, it } from 'vitest'
import { formatLastPerformance, formatSetValues, formatWeightReps } from './formatSet'
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
  ])('kg：%j → %s', (values, expected) => {
    expect(formatSetValues(values, 'kg')).toBe(expected)
  })

  it.each<[SetValues, string]>([
    // 135 lb 存成 kg 的值
    [{ type: 'weight_reps', weightKg: 61.23496995, reps: 8 }, '135.0lb×8'],
    [{ type: 'weight_reps', weightKg: 60, reps: 8 }, '132.3lb×8'],
    [{ type: 'weight_reps', weightKg: null, reps: 8 }, '—lb×8'],
    [{ type: 'reps', reps: 8, addedWeightKg: 10 }, '8下＋22.0lb'],
    [{ type: 'reps', reps: 8, addedWeightKg: null }, '8下'],
    // 距離永遠以 km 顯示
    [{ type: 'distance_duration', distanceKm: 5, durationSec: 1500 }, '5km 25:00'],
  ])('lb：%j → %s', (values, expected) => {
    expect(formatSetValues(values, 'lb')).toBe(expected)
  })

  it('kg 最多顯示 2 位小數（例如 lb 輸入換算後的值）', () => {
    expect(formatSetValues({ type: 'weight_reps', weightKg: 61.23496995, reps: 8 }, 'kg')).toBe(
      '61.23kg×8',
    )
  })
})

describe('formatWeightReps：一組重量×次數的簡短顯示', () => {
  it('與組的顯示相同', () => {
    expect(formatWeightReps({ weightKg: 62.5, reps: 5 }, 'kg')).toBe('62.5kg×5')
    expect(formatWeightReps({ weightKg: 61.23496995, reps: 8 }, 'lb')).toBe('135.0lb×8')
  })
})

describe('formatLastPerformance：動作標題下方的「上次」', () => {
  it('顯示日期 M/D 與各組數值，以頓號分隔', () => {
    expect(
      formatLastPerformance(
        {
          date: '2026-10-20',
          sets: [
            { type: 'weight_reps', weightKg: 60, reps: 8 },
            { type: 'weight_reps', weightKg: 60, reps: 8 },
            { type: 'weight_reps', weightKg: 62.5, reps: 6 },
          ],
        },
        'kg',
      ),
    ).toBe('上次（10/20）：60kg×8、60kg×8、62.5kg×6')
  })

  it('日期不補零', () => {
    expect(
      formatLastPerformance(
        { date: '2026-01-05', sets: [{ type: 'duration', durationSec: 45 }] },
        'kg',
      ),
    ).toBe('上次（1/5）：00:45')
  })
  it('重量跟隨目前的單位', () => {
    expect(
      formatLastPerformance(
        { date: '2026-10-20', sets: [{ type: 'weight_reps', weightKg: 61.23496995, reps: 8 }] },
        'lb',
      ),
    ).toBe('上次（10/20）：135.0lb×8')
  })
})
