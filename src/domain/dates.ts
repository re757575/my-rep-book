import type { LocalDate, Timestamp } from './types'

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'] as const

/** 以本地時區把時間點轉成 `YYYY-MM-DD` */
export function toLocalDate(date: Date): LocalDate {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** 把 `YYYY-MM-DD` 轉成本地時區當天中午的時間點（避開日光節約時間的跨日邊界） */
export function fromLocalDate(date: LocalDate): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

/** 是否為真實存在的 `YYYY-MM-DD` 日期（例如 `2026-02-30` 不合法） */
export function isValidLocalDate(value: string): value is LocalDate {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && toLocalDate(fromLocalDate(value)) === value
}

/** 日期加減天數，例如 `addDays('2026-10-24', -1)` → `2026-10-23` */
export function addDays(date: LocalDate, days: number): LocalDate {
  const result = fromLocalDate(date)
  result.setDate(result.getDate() + days)
  return toLocalDate(result)
}

/** 日期標題：`M/D（週）`，例如 2026-10-24 → `10/24（六）` */
export function formatDateTitle(date: LocalDate): string {
  const [, month, day] = date.split('-').map(Number)
  const weekday = fromLocalDate(date).getDay()
  return `${month}/${day}（${WEEKDAY_LABELS[weekday]}）`
}

/** 以本地時區顯示時間點：`YYYY/MM/DD HH:mm`，例如上次匯出時間 */
export function formatDateTime(timestamp: Timestamp): string {
  const at = new Date(timestamp)
  const pad = (value: number) => String(value).padStart(2, '0')
  const date = `${at.getFullYear()}/${pad(at.getMonth() + 1)}/${pad(at.getDate())}`
  return `${date} ${pad(at.getHours())}:${pad(at.getMinutes())}`
}

/** 帶年份的日期：`YYYY/M/D（週）`，例如 2026-10-20 → `2026/10/20（二）` */
export function formatDateWithYear(date: LocalDate): string {
  return `${date.slice(0, 4)}/${formatDateTitle(date)}`
}
