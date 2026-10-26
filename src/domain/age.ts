import { isValidLocalDate } from './dates'
import type { LocalDate, ParsedDateInput } from './types'

/** 最早可以填的生日 */
const EARLIEST_BIRTH_DATE = '1900-01-01'

/** 生日是否合法（匯入時檢查）：存在的日期，且不早於 1900-01-01；不晚於今天要在輸入時另外檢查 */
export function isValidBirthDate(date: string): boolean {
  return isValidLocalDate(date) && date >= EARLIEST_BIRTH_DATE
}

/**
 * 解析日期欄位輸入的生日（`YYYY-MM-DD`）。空白為 null，代表尚未填寫；
 * 不合法或晚於 `today` 時回傳錯誤訊息，呼叫端不應寫入。
 */
export function parseBirthDateInput(text: string, today: LocalDate): ParsedDateInput {
  if (text === '') return { ok: true, value: null }
  if (!isValidLocalDate(text)) return { ok: false, error: '請輸入有效的日期' }
  if (text < EARLIEST_BIRTH_DATE) return { ok: false, error: '請輸入 1900 年之後的日期' }
  if (text > today) return { ok: false, error: '不可晚於今天' }
  return { ok: true, value: text }
}

/**
 * 滿幾歲：今年的生日還沒到就少一歲。2/29 出生的人在非閏年的 3/1 才算滿一歲
 * （月日字串比較，02-29 大於 02-28）。
 */
export function calculateAge(birthDate: LocalDate, on: LocalDate): number {
  const years = Number(on.slice(0, 4)) - Number(birthDate.slice(0, 4))
  return on.slice(5) < birthDate.slice(5) ? years - 1 : years
}
