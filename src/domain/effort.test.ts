import { describe, expect, it } from 'vitest'
import { effortOptionLabel, formatEffort, isValidRpe, RPE_OPTIONS, rpeToRir } from './effort'

describe('強度（RPE／RIR）', () => {
  it('RIR = 10 − RPE：RPE 10 是做到極限', () => {
    expect(RPE_OPTIONS.map(rpeToRir)).toEqual([4, 3, 2, 1, 0])
  })

  it('顯示：RPE 或 RIR', () => {
    expect(formatEffort(8, 'rpe')).toBe('RPE 8')
    expect(formatEffort(8, 'rir')).toBe('RIR 2')
    expect(formatEffort(10, 'rir')).toBe('RIR 0')
  })

  it('輸入按鈕上的字：RPE 是 6–10，RIR 是 4–0，位置對應同一個值', () => {
    expect(RPE_OPTIONS.map((rpe) => effortOptionLabel(rpe, 'rpe'))).toEqual([
      '6',
      '7',
      '8',
      '9',
      '10',
    ])
    expect(RPE_OPTIONS.map((rpe) => effortOptionLabel(rpe, 'rir'))).toEqual([
      '4',
      '3',
      '2',
      '1',
      '0',
    ])
  })

  it.each([
    [1, true],
    [10, true],
    [8, true],
    [0, false],
    [11, false],
    [8.5, false],
    ['8', false],
    [null, false],
  ])('isValidRpe(%j) → %j', (value, expected) => {
    expect(isValidRpe(value)).toBe(expected)
  })
})
