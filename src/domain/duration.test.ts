import { describe, expect, it } from 'vitest'
import {
  durationTextAfterColon,
  formatDuration,
  maskDurationInput,
  parseDuration,
} from './duration'

describe('parseDuration：mm:ss 轉成秒數', () => {
  it.each([
    ['00:01', 1],
    ['0:01', 1],
    ['01:30', 90],
    ['1:30', 90],
    ['00:59', 59],
    ['20:00', 1200],
    ['999:59', 59999],
    [' 01:30 ', 90],
    // 手機的數字鍵盤沒有冒號：只打數字時，最後兩位是秒
    ['130', 90],
    ['0130', 90],
    ['5', 5],
    ['45', 45],
    ['99959', 59999],
  ])('%s → %i 秒', (text, seconds) => {
    expect(parseDuration(text)).toEqual({ ok: true, value: seconds })
  })

  it('空白代表尚未填寫', () => {
    expect(parseDuration('')).toEqual({ ok: true, value: null })
    expect(parseDuration('  ')).toEqual({ ok: true, value: null })
  })

  it.each([
    ['00:60', '秒數須為 0–59'],
    ['1:75', '秒數須為 0–59'],
    ['90', '秒數須為 0–59'],
    ['1000:00', '分鐘須為 0–999'],
    ['100000', '分鐘須為 0–999'],
    ['00:00', '時間須大於 0'],
    ['0:00', '時間須大於 0'],
    ['0', '時間須大於 0'],
    ['1:3', '請以 mm:ss 輸入'],
    ['1:', '請以 mm:ss 輸入'],
    [':30', '請以 mm:ss 輸入'],
    ['1:30:00', '請以 mm:ss 輸入'],
    ['-1:30', '請以 mm:ss 輸入'],
    ['1.5', '請以 mm:ss 輸入'],
    ['abc', '請以 mm:ss 輸入'],
  ])('%s 不合法：%s', (text, error) => {
    expect(parseDuration(text)).toEqual({ ok: false, error })
  })
})

describe('formatDuration：秒數轉成 mm:ss', () => {
  it.each([
    [1, '00:01'],
    [59, '00:59'],
    [60, '01:00'],
    [90, '01:30'],
    [1200, '20:00'],
    [5999, '99:59'],
    [6000, '100:00'],
    [59999, '999:59'],
  ])('%i 秒 → %s', (seconds, text) => {
    expect(formatDuration(seconds)).toBe(text)
  })

  it.each([1, 90, 1200, 59999])('格式化後再解析，回到原本的 %i 秒', (seconds) => {
    expect(parseDuration(formatDuration(seconds))).toEqual({ ok: true, value: seconds })
  })
})

describe('maskDurationInput：輸入數字時自動補冒號', () => {
  it.each([
    ['1', '00:01'],
    ['13', '00:13'],
    ['130', '01:30'],
    ['2500', '25:00'],
    ['99959', '999:59'],
    ['0', '00:00'],
    ['000', '00:00'],
  ])('%j → %j', (text, expected) => {
    expect(maskDurationInput(text)).toBe(expected)
  })

  it('接著上一次顯示的值再打一位，數字繼續往左推，不會多出前面的 0', () => {
    // 01:30 → 打 5 → 01:305 → 13:05
    expect(maskDurationInput('01:305')).toBe('13:05')
    // 退格：01:30 → 01:3 → 00:13
    expect(maskDurationInput('01:3')).toBe('00:13')
    expect(maskDurationInput('00:0')).toBe('00:00')
  })

  it('貼上帶冒號的時間也得到同樣的結果', () => {
    expect(maskDurationInput('1:30')).toBe('01:30')
    expect(maskDurationInput('01:30')).toBe('01:30')
  })

  it('沒有數字時是空字串', () => {
    expect(maskDurationInput('')).toBe('')
    expect(maskDurationInput(':')).toBe('')
  })

  it('超過 5 位數時回傳 undefined（忽略這次輸入）', () => {
    expect(maskDurationInput('999:591')).toBeUndefined()
  })

  it('顯示的值和只打數字的解析一致', () => {
    for (const digits of ['1', '45', '130', '2500', '12345']) {
      const masked = maskDurationInput(digits)!
      expect(parseDuration(masked)).toEqual(parseDuration(digits))
    }
  })
})

describe('durationTextAfterColon：自己打了冒號', () => {
  it.each([
    ['00:01:', '1:'],
    ['01:30:', '130:'],
    ['00:00:', '0:'],
    [':', '0:'],
  ])('%j → %j', (text, expected) => {
    expect(durationTextAfterColon(text)).toBe(expected)
  })
})
