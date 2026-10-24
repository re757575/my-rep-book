import { toLocalDate, type LocalDate } from '@/domain'

/** 今天的日期（依裝置的本地時區） */
export function today(): LocalDate {
  return toLocalDate(new Date())
}

/** 訓練頁的路徑：今天是 `/`，其他日期是 `/day/YYYY-MM-DD` */
export function dayPath(date: LocalDate): string {
  return date === today() ? '/' : `/day/${date}`
}
