import { describe, expect, it } from 'vitest'
import { calculateAge, isValidBirthDate, parseBirthDateInput } from './age'

describe('calculateAge：滿幾歲', () => {
  it.each<[string, string, number]>([
    ['1990-05-20', '2026-10-24', 36],
    // 生日當天滿歲，前一天還沒
    ['1990-10-24', '2026-10-24', 36],
    ['1990-10-25', '2026-10-24', 35],
    // 2/29 出生：非閏年的 2/28 還沒滿，3/1 才滿；閏年的 2/29 當天滿
    ['2000-02-29', '2027-02-28', 26],
    ['2000-02-29', '2027-03-01', 27],
    ['2000-02-29', '2028-02-29', 28],
    ['2026-10-24', '2026-10-24', 0],
  ])('%s 出生，在 %s 為 %d 歲', (birthDate, on, age) => {
    expect(calculateAge(birthDate, on)).toBe(age)
  })
})

describe('parseBirthDateInput：生日輸入', () => {
  const today = '2026-10-24'

  it('合法的日期原樣回傳；今天也可以', () => {
    expect(parseBirthDateInput('1990-05-20', today)).toEqual({ ok: true, value: '1990-05-20' })
    expect(parseBirthDateInput('2026-10-24', today)).toEqual({ ok: true, value: '2026-10-24' })
  })

  it('空白代表尚未填寫', () => {
    expect(parseBirthDateInput('', today)).toEqual({ ok: true, value: null })
  })

  it.each<[string, string]>([
    ['2026-10-25', '不可晚於今天'],
    ['1899-12-31', '請輸入 1900 年之後的日期'],
    ['1990-02-30', '請輸入有效的日期'],
    ['1990/05/20', '請輸入有效的日期'],
  ])('「%s」→ %s', (text, error) => {
    expect(parseBirthDateInput(text, today)).toEqual({ ok: false, error })
  })
})

describe('isValidBirthDate：匯入時的檢查', () => {
  it.each<[string, boolean]>([
    ['1990-05-20', true],
    ['1900-01-01', true],
    ['1899-12-31', false],
    ['1990-02-30', false],
    ['五月二十', false],
  ])('%s → %s', (date, valid) => {
    expect(isValidBirthDate(date)).toBe(valid)
  })
})
