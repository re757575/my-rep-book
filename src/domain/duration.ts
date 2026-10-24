import type { ParsedInput } from './types'

const MAX_MINUTES = 999
const WITH_COLON = /^(\d+):(\d{2})$/
const DIGITS_ONLY = /^\d{1,6}$/

/**
 * 把 `mm:ss` 解析成秒數。手機的數字鍵盤沒有冒號，所以也接受只打數字，
 * 此時最後兩位是秒（`130` 為 1:30）。mm 為 0–999、ss 為 0–59，總長須大於 0。
 */
export function parseDuration(text: string): ParsedInput {
  const trimmed = text.trim()
  if (trimmed === '') return { ok: true, value: null }

  let minutes: number
  let seconds: number
  const colonMatch = WITH_COLON.exec(trimmed)
  if (colonMatch) {
    minutes = Number(colonMatch[1])
    seconds = Number(colonMatch[2])
  } else if (DIGITS_ONLY.test(trimmed)) {
    minutes = Number(trimmed.slice(0, -2) || '0')
    seconds = Number(trimmed.slice(-2))
  } else {
    return { ok: false, error: '請以 mm:ss 輸入' }
  }

  if (minutes > MAX_MINUTES) return { ok: false, error: '分鐘須為 0–999' }
  if (seconds > 59) return { ok: false, error: '秒數須為 0–59' }
  const total = minutes * 60 + seconds
  if (total === 0) return { ok: false, error: '時間須大於 0' }
  return { ok: true, value: total }
}

/** 把秒數格式化成 `mm:ss`，分鐘至少兩位數 */
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
