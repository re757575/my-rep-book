import { describe, expect, it } from 'vitest'
import { formatWeight, kgToLb, lbToKg } from './units'

describe('lbToKg／kgToLb：重量單位換算（1 lb = 0.45359237 kg）', () => {
  it('lb 換算成 kg 不四捨五入', () => {
    expect(lbToKg(1)).toBe(0.45359237)
    expect(lbToKg(135)).toBeCloseTo(61.23496995, 12)
  })

  it('kg 換算成 lb', () => {
    expect(kgToLb(0.45359237)).toBe(1)
    expect(kgToLb(100)).toBeCloseTo(220.46226218, 8)
  })

  it('來回換算後回到原本的值', () => {
    expect(kgToLb(lbToKg(135))).toBeCloseTo(135, 10)
    expect(lbToKg(kgToLb(62.5))).toBeCloseTo(62.5, 10)
  })
})

describe('formatWeight：以顯示單位顯示以 kg 儲存的重量', () => {
  it.each<[number, string]>([
    [60, '60'],
    [62.5, '62.5'],
    [1.25, '1.25'],
    [0, '0'],
    // 135 lb 換算成 kg 的值，顯示到最多 2 位小數
    [61.23496995, '61.23'],
    [99.999, '100'],
  ])('kg：%d → %s（最多 2 位小數，不補零）', (kg, expected) => {
    expect(formatWeight(kg, 'kg')).toBe(expected)
  })

  it.each<[number, string]>([
    [61.23496995, '135.0'],
    [60, '132.3'],
    [100, '220.5'],
    [0, '0.0'],
  ])('lb：%d kg → %s（四捨五入到 0.1）', (kg, expected) => {
    expect(formatWeight(kg, 'lb')).toBe(expected)
  })

  it('需要時加上千分位', () => {
    expect(formatWeight(1234.5, 'kg', { grouping: true })).toBe('1,234.5')
    expect(formatWeight(1000, 'lb', { grouping: true })).toBe('2,204.6')
    expect(formatWeight(1234.5, 'kg')).toBe('1234.5')
  })
})
