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

/** `mm:ss` 的數字最多 5 位（999:59） */
const MAX_DURATION_DIGITS = 5

function significantDigits(text: string): string {
  return text.replace(/\D/g, '').replace(/^0+/, '')
}

/**
 * 時間欄位輸入數字時自動補上冒號：手機的數字鍵盤沒有冒號，所以數字由右往左填入，
 * 最後兩位是秒，和只打數字的解析一致（`parseDuration`）。打 `1`、`13`、`130` 依序顯示
 * `00:01`、`00:13`、`01:30`；貼上 `1:30` 也得到 `01:30`。
 * 沒有任何數字時是空字串；超過 5 位數（999:59 放不下）時回傳 undefined，呼叫端忽略這次輸入。
 */
export function maskDurationInput(text: string): string | undefined {
  if (!/\d/.test(text)) return ''
  const digits = significantDigits(text)
  if (digits.length > MAX_DURATION_DIGITS) return undefined
  const padded = digits.padStart(4, '0')
  return `${padded.slice(0, -2)}:${padded.slice(-2)}`
}

/**
 * 使用者自己打了冒號（桌機鍵盤）：不再自動補，改成照他打的來。
 * 把目前已顯示的數字還原成他剛打完的分鐘，例如 `00:01` 後面接冒號得到 `1:`，全是 0 時得到 `0:`。
 */
export function durationTextAfterColon(text: string): string {
  return `${significantDigits(text) || '0'}:`
}
