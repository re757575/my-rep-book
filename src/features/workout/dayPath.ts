import { toLocalDate, type LocalDate } from '@/domain'

/** 今天的日期（依裝置的本地時區） */
export function today(): LocalDate {
  return toLocalDate(new Date())
}

/**
 * 前往訓練頁時帶的 location state：`unlocked` 為 true 時一進入就解鎖，
 * 用在「編輯」這類明確要修改的連結（非今天的訓練頁預設鎖定）
 */
export interface DayRouteState {
  unlocked?: boolean
}

/** 明確要修改紀錄的連結用這個 state，例如 `<Link to={dayPath(date)} state={UNLOCKED}>` */
export const UNLOCKED: DayRouteState = { unlocked: true }

/** 訓練頁的路徑：今天是 `/`，其他日期是 `/day/YYYY-MM-DD` */
export function dayPath(date: LocalDate): string {
  return date === today() ? '/' : `/day/${date}`
}
