import type { LocalDate } from './types'

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'] as const

/** 以本地時區把時間點轉成 `YYYY-MM-DD` */
export function toLocalDate(date: Date): LocalDate {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** 日期標題：`M/D（週）`，例如 2026-10-24 → `10/24（六）` */
export function formatDateTitle(date: LocalDate): string {
  const [year, month, day] = date.split('-').map(Number)
  const weekday = new Date(year, month - 1, day).getDay()
  return `${month}/${day}（${WEEKDAY_LABELS[weekday]}）`
}
