import { describe, expect, it } from 'vitest'
import {
  adjustRest,
  formatRemaining,
  formatRestDuration,
  REST_FINISHED_VISIBLE_MS,
  restTimerPhase,
  startRest,
} from './restTimer'

const NOW = 1_000_000

describe('startRest／restTimerPhase', () => {
  it('開始休息後倒數，剩餘秒數無條件進位', () => {
    const timer = startRest(90, NOW)
    expect(timer).toEqual({ endsAt: NOW + 90_000, alerted: false })
    expect(restTimerPhase(timer, NOW)).toEqual({ kind: 'running', remainingSec: 90 })
    expect(restTimerPhase(timer, NOW + 500)).toEqual({ kind: 'running', remainingSec: 90 })
    expect(restTimerPhase(timer, NOW + 1_000)).toEqual({ kind: 'running', remainingSec: 89 })
    expect(restTimerPhase(timer, NOW + 89_001)).toEqual({ kind: 'running', remainingSec: 1 })
  })

  it('時間到之後的一小段時間是「剛結束」，再之後回到沒有計時器', () => {
    const timer = startRest(60, NOW)
    const end = NOW + 60_000
    expect(restTimerPhase(timer, end)).toEqual({ kind: 'finished' })
    expect(restTimerPhase(timer, end + REST_FINISHED_VISIBLE_MS - 1)).toEqual({ kind: 'finished' })
    expect(restTimerPhase(timer, end + REST_FINISHED_VISIBLE_MS)).toEqual({ kind: 'idle' })
  })

  it('沒有計時器時是 idle', () => {
    expect(restTimerPhase(null, NOW)).toEqual({ kind: 'idle' })
  })
})

describe('adjustRest', () => {
  it('倒數中可以增減秒數，最少保留 1 秒', () => {
    const timer = startRest(60, NOW)
    expect(adjustRest(timer, 15, NOW + 10_000).endsAt).toBe(NOW + 75_000)
    expect(adjustRest(timer, -15, NOW + 10_000).endsAt).toBe(NOW + 45_000)
    expect(adjustRest(timer, -15, NOW + 55_000).endsAt).toBe(NOW + 56_000)
  })

  it('已經結束的計時器不能調整', () => {
    const timer = startRest(60, NOW)
    expect(adjustRest(timer, 15, NOW + 61_000)).toBe(timer)
  })
})

describe('格式化', () => {
  it.each([
    [90, '1:30'],
    [5, '0:05'],
    [600, '10:00'],
  ])('剩餘 %d 秒 → %s', (seconds, text) => {
    expect(formatRemaining(seconds)).toBe(text)
  })

  it.each([
    [45, '45 秒'],
    [60, '1 分'],
    [90, '1 分 30 秒'],
    [180, '3 分'],
  ])('休息時間 %d 秒 → %s', (seconds, text) => {
    expect(formatRestDuration(seconds)).toBe(text)
  })
})
