import { describe, expect, it } from 'vitest'
import {
  addDays,
  formatDateTitle,
  formatDateWithYear,
  isValidLocalDate,
  toLocalDate,
} from './dates'

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

describe('formatDateWithYear：帶年份的日期 YYYY/M/D（週）', () => {
  it.each([
    ['2026-10-20', '2026/10/20（二）'],
    ['2027-01-05', '2027/1/5（二）'],
  ])('%s → %s', (date, expected) => {
    expect(formatDateWithYear(date)).toBe(expected)
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

describe('addDays：日期加減天數', () => {
  it.each([
    ['2026-10-24', -1, '2026-10-23'],
    ['2026-10-23', 1, '2026-10-24'],
    ['2026-11-01', -1, '2026-10-31'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2027-01-01', -1, '2026-12-31'],
    ['2028-02-28', 1, '2028-02-29'],
    ['2027-02-28', 1, '2027-03-01'],
    ['2026-10-24', 0, '2026-10-24'],
  ])('%s %+d 天 → %s', (date, days, expected) => {
    expect(addDays(date, days)).toBe(expected)
  })
})

describe('isValidLocalDate：是否為合法的 YYYY-MM-DD', () => {
  it.each([
    ['2026-10-24', true],
    ['2028-02-29', true],
    ['2027-02-29', false],
    ['2026-02-30', false],
    ['2026-13-01', false],
    ['2026-00-10', false],
    ['2026-10-00', false],
    ['2026-1-5', false],
    ['20261024', false],
    ['abc', false],
    ['', false],
  ])('%s → %s', (value, expected) => {
    expect(isValidLocalDate(value)).toBe(expected)
  })
})
