import { describe, expect, it } from 'vitest'
import {
  isCompleteSet,
  isSteppableField,
  parseSetInput,
  stepSetValue,
  validateSetValues,
  type SetField,
} from './setValues'
import { toKg } from './units'
import type { SetValues } from './types'

describe('parseSetInput：組的欄位輸入', () => {
  it.each<[SetField, string, number]>([
    ['weightKg', '0', 0],
    ['weightKg', '60', 60],
    ['weightKg', '62.5', 62.5],
    ['weightKg', '62.25', 62.25],
    ['weightKg', ' 62.5 ', 62.5],
    ['weightKg', '62.', 62],
    ['weightKg', '.5', 0.5],
    ['addedWeightKg', '0', 0],
    ['addedWeightKg', '10.25', 10.25],
    ['distanceKm', '0', 0],
    ['distanceKm', '5', 5],
    ['distanceKm', '5.25', 5.25],
    ['reps', '1', 1],
    ['reps', '8', 8],
    ['reps', '9999', 9999],
    ['durationSec', '01:30', 90],
  ])('%s 輸入 %j → %d', (field, text, value) => {
    expect(parseSetInput(field, text, 'kg')).toEqual({ ok: true, value })
  })

  it.each<SetField>(['weightKg', 'reps', 'addedWeightKg', 'durationSec', 'distanceKm'])(
    '%s 空白代表尚未填寫',
    (field) => {
      expect(parseSetInput(field, ' ', 'kg')).toEqual({ ok: true, value: null })
    },
  )

  it.each<[SetField, string, string]>([
    ['weightKg', '-1', '不可小於 0'],
    ['weightKg', '-0.5', '不可小於 0'],
    ['weightKg', '62.555', '最多 2 位小數'],
    ['weightKg', 'abc', '請輸入數字'],
    ['weightKg', '1e3', '請輸入數字'],
    ['weightKg', '6 0', '請輸入數字'],
    ['weightKg', '.', '請輸入數字'],
    ['addedWeightKg', '-5', '不可小於 0'],
    ['addedWeightKg', '2.125', '最多 2 位小數'],
    ['distanceKm', '-0.1', '不可小於 0'],
    ['distanceKm', '5.125', '最多 2 位小數'],
    ['distanceKm', '5km', '請輸入數字'],
    ['reps', '0', '請輸入 1–9999 的整數'],
    ['reps', '10000', '請輸入 1–9999 的整數'],
    ['reps', '8.5', '請輸入 1–9999 的整數'],
    ['reps', '-1', '請輸入 1–9999 的整數'],
    ['reps', 'abc', '請輸入 1–9999 的整數'],
    ['durationSec', '00:60', '秒數須為 0–59'],
    ['durationSec', '00:00', '時間須大於 0'],
  ])('%s 輸入 %j 不合法：%s', (field, text, error) => {
    expect(parseSetInput(field, text, 'kg')).toEqual({ ok: false, error })
  })

  describe('lb 模式', () => {
    it.each<[SetField, string, number]>([
      ['weightKg', '135', 61.23496995],
      ['weightKg', '135.25', 61.3483680425],
      ['addedWeightKg', '25', 11.33980925],
    ])('%s 輸入 %j lb → 換算成 %d kg，不四捨五入', (field, text, kg) => {
      const parsed = parseSetInput(field, text, 'lb')
      expect(parsed.ok && parsed.value).toBeCloseTo(kg, 12)
    })

    it('0 lb 是 0 kg', () => {
      expect(parseSetInput('weightKg', '0', 'lb')).toEqual({ ok: true, value: 0 })
    })

    it('小數位數以輸入的 lb 為準', () => {
      expect(parseSetInput('weightKg', '135.255', 'lb')).toEqual({
        ok: false,
        error: '最多 2 位小數',
      })
    })

    it.each<[SetField, string, number]>([
      ['distanceKm', '5.25', 5.25],
      ['reps', '8', 8],
      ['durationSec', '01:30', 90],
    ])('%s 不受重量單位影響：%j → %d', (field, text, value) => {
      expect(parseSetInput(field, text, 'lb')).toEqual({ ok: true, value })
    })
  })
})

describe('validateSetValues 與 isCompleteSet：組數值驗證與完整的組', () => {
  it.each<[string, SetValues]>([
    ['重量×次數', { type: 'weight_reps', weightKg: 60, reps: 8 }],
    ['重量 0（空槓）也算完整', { type: 'weight_reps', weightKg: 0, reps: 1 }],
    ['lb 換算後的 kg 不受小數位數限制', { type: 'weight_reps', weightKg: 45.359237, reps: 9999 }],
    ['次數，沒有額外負重', { type: 'reps', reps: 10, addedWeightKg: null }],
    ['次數，加上額外負重', { type: 'reps', reps: 10, addedWeightKg: 10 }],
    ['額外負重 0', { type: 'reps', reps: 10, addedWeightKg: 0 }],
    ['時間 1 秒', { type: 'duration', durationSec: 1 }],
    ['時間 999:59', { type: 'duration', durationSec: 59999 }],
    ['距離＋時間', { type: 'distance_duration', distanceKm: 5.25, durationSec: 1500 }],
    ['距離 0', { type: 'distance_duration', distanceKm: 0, durationSec: 600 }],
  ])('完整的組：%s', (_, values) => {
    expect(validateSetValues(values)).toEqual({})
    expect(isCompleteSet(values)).toBe(true)
  })

  it.each<[string, SetValues]>([
    ['沒填重量', { type: 'weight_reps', weightKg: null, reps: 8 }],
    ['沒填次數', { type: 'weight_reps', weightKg: 60, reps: null }],
    ['全部沒填', { type: 'weight_reps', weightKg: null, reps: null }],
    ['次數類型沒填次數，即使有額外負重', { type: 'reps', reps: null, addedWeightKg: 10 }],
    ['沒填時間', { type: 'duration', durationSec: null }],
    ['沒填距離', { type: 'distance_duration', distanceKm: null, durationSec: 1500 }],
    ['沒填時間（距離＋時間）', { type: 'distance_duration', distanceKm: 5, durationSec: null }],
  ])('沒填完的組合法但不完整：%s', (_, values) => {
    expect(validateSetValues(values)).toEqual({})
    expect(isCompleteSet(values)).toBe(false)
  })

  it.each<[string, SetValues, ReturnType<typeof validateSetValues>]>([
    ['負重量', { type: 'weight_reps', weightKg: -1, reps: 8 }, { weightKg: '不可小於 0' }],
    ['次數為 0', { type: 'weight_reps', weightKg: 60, reps: 0 }, { reps: '請輸入 1–9999 的整數' }],
    [
      '次數超過 9999',
      { type: 'reps', reps: 10000, addedWeightKg: null },
      { reps: '請輸入 1–9999 的整數' },
    ],
    [
      '次數不是整數',
      { type: 'weight_reps', weightKg: 60, reps: 8.5 },
      { reps: '請輸入 1–9999 的整數' },
    ],
    [
      '負的額外負重',
      { type: 'reps', reps: 10, addedWeightKg: -5 },
      { addedWeightKg: '不可小於 0' },
    ],
    ['時間為 0', { type: 'duration', durationSec: 0 }, { durationSec: '時間須大於 0' }],
    [
      '時間超過 999:59',
      { type: 'duration', durationSec: 60000 },
      { durationSec: '時間須在 999:59 以內' },
    ],
    ['時間不是整數秒', { type: 'duration', durationSec: 1.5 }, { durationSec: '時間須為整數秒' }],
    [
      '距離超過 2 位小數',
      { type: 'distance_duration', distanceKm: 5.125, durationSec: 1500 },
      { distanceKm: '最多 2 位小數' },
    ],
    [
      '負距離且時間為 0',
      { type: 'distance_duration', distanceKm: -1, durationSec: 0 },
      { distanceKm: '不可小於 0', durationSec: '時間須大於 0' },
    ],
    [
      '重量不是有限數字',
      { type: 'weight_reps', weightKg: Number.NaN, reps: 8 },
      { weightKg: '請輸入數字' },
    ],
  ])('數值不合法：%s', (_, values, errors) => {
    expect(validateSetValues(values)).toEqual(errors)
    expect(isCompleteSet(values)).toBe(false)
  })
})

describe('stepSetValue：−／+ 微調', () => {
  it.each<['weightKg' | 'addedWeightKg', number | null, 1 | -1, number | null]>([
    ['weightKg', 60, 1, 62.5],
    ['weightKg', 62.5, -1, 60],
    ['weightKg', 62.25, 1, 64.75],
    ['weightKg', 2.5, -1, 0],
    ['weightKg', 1, -1, 0],
    ['weightKg', null, 1, 2.5],
    ['addedWeightKg', null, 1, 2.5],
    ['addedWeightKg', 10, 1, 12.5],
  ])('%s %j 方向 %d → %j（kg）', (field, value, direction, expected) => {
    expect(stepSetValue(field, value, direction, 'kg')).toBe(expected)
  })

  it('重量已經是 0 或尚未填寫時，− 維持原值', () => {
    expect(stepSetValue('weightKg', 0, -1, 'kg')).toBe(0)
    expect(stepSetValue('weightKg', null, -1, 'kg')).toBeNull()
  })

  it('lb 模式以畫面上顯示的 lb 增減 5，結果換算回 kg', () => {
    const kg135 = toKg(135, 'lb')
    expect(stepSetValue('weightKg', kg135, 1, 'lb')).toBeCloseTo(toKg(140, 'lb'), 10)
    expect(stepSetValue('weightKg', kg135, -1, 'lb')).toBeCloseTo(toKg(130, 'lb'), 10)
    expect(stepSetValue('weightKg', null, 1, 'lb')).toBeCloseTo(toKg(5, 'lb'), 10)
    expect(stepSetValue('weightKg', toKg(3, 'lb'), -1, 'lb')).toBe(0)
  })

  it.each<[number | null, 1 | -1, number | null]>([
    [8, 1, 9],
    [8, -1, 7],
    [1, -1, 1],
    [9999, 1, 9999],
    [null, 1, 1],
    [null, -1, null],
  ])('reps %j 方向 %d → %j', (value, direction, expected) => {
    expect(stepSetValue('reps', value, direction, 'kg')).toBe(expected)
  })

  it('只有重量、額外負重與次數可以微調', () => {
    expect(isSteppableField('weightKg')).toBe(true)
    expect(isSteppableField('addedWeightKg')).toBe(true)
    expect(isSteppableField('reps')).toBe(true)
    expect(isSteppableField('durationSec')).toBe(false)
    expect(isSteppableField('distanceKm')).toBe(false)
  })
})
