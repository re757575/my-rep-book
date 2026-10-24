import { describe, expect, it } from 'vitest'
import { formatDuration, parseDuration } from './duration'

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
