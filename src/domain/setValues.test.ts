import { describe, expect, it } from 'vitest'
import { isCompleteSet, parseSetInput, validateSetValues, type SetField } from './setValues'
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
    expect(parseSetInput(field, text)).toEqual({ ok: true, value })
  })

  it.each<SetField>(['weightKg', 'reps', 'addedWeightKg', 'durationSec', 'distanceKm'])(
    '%s 空白代表尚未填寫',
    (field) => {
      expect(parseSetInput(field, ' ')).toEqual({ ok: true, value: null })
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
    expect(parseSetInput(field, text)).toEqual({ ok: false, error })
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
