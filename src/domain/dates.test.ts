import { describe, expect, it } from 'vitest'
import { formatDateTitle, toLocalDate } from './dates'

describe('formatDateTitle：日期標題 M/D（週）', () => {
  it.each([
    ['2026-10-19', '10/19（一）'],
    ['2026-10-20', '10/20（二）'],
    ['2026-10-21', '10/21（三）'],
    ['2026-10-22', '10/22（四）'],
    ['2026-10-23', '10/23（五）'],
    ['2026-10-24', '10/24（六）'],
    ['2026-10-25', '10/25（日）'],
    ['2027-01-05', '1/5（二）'],
  ])('%s → %s', (date, expected) => {
    expect(formatDateTitle(date)).toBe(expected)
  })
})

describe('toLocalDate：以本地時區取日期', () => {
  it.each([
    [new Date(2026, 9, 24, 0, 0, 0), '2026-10-24'],
    [new Date(2026, 9, 24, 23, 59, 59), '2026-10-24'],
    [new Date(2027, 0, 5, 12), '2027-01-05'],
  ])('%s → %s', (date, expected) => {
    expect(toLocalDate(date)).toBe(expected)
  })
})
