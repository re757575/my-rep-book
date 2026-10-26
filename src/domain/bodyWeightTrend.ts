import { addDays } from './dates'
import type { BodyWeightEntry, LocalDate } from './types'

/** 平均的區間長度（天） */
const WINDOW_DAYS = 7

/** 體重紀錄中的一筆，加上趨勢 */
export interface BodyWeightTrendEntry extends BodyWeightEntry {
  /** 7 日平均（kg）：這天往前 7 天內（含當天）所有體重的平均，沒記的日子不計入 */
  averageKg: number
  /** 比上週增減（kg）：這筆的 7 日平均減去 7 天前的 7 日平均；上一週沒有任何體重時為 null */
  changeFromLastWeekKg: number | null
}

/** `end` 往前 7 天內（含當天）有記的體重平均；都沒記時為 null */
function averageEnding(weights: ReadonlyMap<LocalDate, number>, end: LocalDate): number | null {
  const values: number[] = []
  for (let offset = 0; offset < WINDOW_DAYS; offset++) {
    const weight = weights.get(addDays(end, -offset))
    if (weight !== undefined) values.push(weight)
  }
  if (values.length === 0) return null
  return values.reduce((total, value) => total + value, 0) / values.length
}

/**
 * 每筆體重的 7 日平均與比上週增減，順序同輸入。
 * 每天的體重會因為水分、飲食上下跳動，看平均比看單日準。
 */
export function buildBodyWeightTrend(entries: readonly BodyWeightEntry[]): BodyWeightTrendEntry[] {
  const weights = new Map(entries.map((entry) => [entry.date, entry.weightKg]))
  return entries.map((entry) => {
    // 包含這一筆，所以一定有值
    const averageKg = averageEnding(weights, entry.date) ?? entry.weightKg
    const lastWeek = averageEnding(weights, addDays(entry.date, -WINDOW_DAYS))
    return {
      ...entry,
      averageKg,
      changeFromLastWeekKg: lastWeek === null ? null : averageKg - lastWeek,
    }
  })
}
