import { describe, expect, it } from 'vitest'
import {
  calculateBmi,
  formatBmi,
  isValidBodyWeightKg,
  isValidHeightCm,
  parseBodyWeightInput,
  parseHeightInput,
} from './bodyMetrics'

describe('parseBodyWeightInput：體重輸入', () => {
  it.each<[string, number]>([
    ['72', 72],
    ['72.5', 72.5],
    ['72.25', 72.25],
    [' 72.5 ', 72.5],
    ['72.', 72],
  ])('kg：「%s」→ %d', (text, value) => {
    expect(parseBodyWeightInput(text, 'kg')).toEqual({ ok: true, value })
  })

  it('lb：換算成 kg，不四捨五入', () => {
    expect(parseBodyWeightInput('160', 'lb')).toEqual({ ok: true, value: 160 * 0.45359237 })
  })

  it('空白代表不記錄', () => {
    expect(parseBodyWeightInput(' ', 'kg')).toEqual({ ok: true, value: null })
  })

  it.each<[string, string]>([
    ['0', '須大於 0'],
    ['0.00', '須大於 0'],
    ['-1', '不可小於 0'],
    ['72.555', '最多 2 位小數'],
    ['abc', '請輸入數字'],
  ])('「%s」→ %s', (text, error) => {
    expect(parseBodyWeightInput(text, 'kg')).toEqual({ ok: false, error })
  })
})

describe('parseHeightInput：身高輸入（cm）', () => {
  it.each<[string, number]>([
    ['175', 175],
    ['175.5', 175.5],
    ['50', 50],
    ['300', 300],
  ])('「%s」→ %d', (text, value) => {
    expect(parseHeightInput(text)).toEqual({ ok: true, value })
  })

  it('空白代表尚未填寫', () => {
    expect(parseHeightInput('')).toEqual({ ok: true, value: null })
  })

  it.each<[string, string]>([
    ['49.9', '請輸入 50–300 的數字'],
    ['300.5', '請輸入 50–300 的數字'],
    ['1750', '請輸入 50–300 的數字'],
    ['175.555', '最多 2 位小數'],
    ['-175', '不可小於 0'],
    ['一七五', '請輸入數字'],
  ])('「%s」→ %s', (text, error) => {
    expect(parseHeightInput(text)).toEqual({ ok: false, error })
  })
})

describe('體重與身高的合法範圍（匯入時檢查）', () => {
  it.each<[number, boolean]>([
    [72.5, true],
    [0.01, true],
    [0, false],
    [-1, false],
    [Number.NaN, false],
  ])('體重 %d kg → %s', (kg, valid) => {
    expect(isValidBodyWeightKg(kg)).toBe(valid)
  })

  it.each<[number, boolean]>([
    [175, true],
    [50, true],
    [300, true],
    [49.9, false],
    [301, false],
  ])('身高 %d cm → %s', (cm, valid) => {
    expect(isValidHeightCm(cm)).toBe(valid)
  })
})

describe('BMI', () => {
  it('體重（kg）÷ 身高（m）²', () => {
    expect(calculateBmi(70, 175)).toBeCloseTo(22.857, 3)
    expect(calculateBmi(81, 180)).toBeCloseTo(25, 10)
  })

  it.each<[number, string]>([
    [22.857, '22.9'],
    [25, '25.0'],
    [18.44, '18.4'],
  ])('%d 顯示為 %s', (bmi, expected) => {
    expect(formatBmi(bmi)).toBe(expected)
  })
})
