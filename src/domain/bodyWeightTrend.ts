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

/** 體重趨勢圖的區間（US-36）：從今天往前算的天數（含今天），`all` 是全部 */
export const BODY_WEIGHT_CHART_RANGES = ['30d', '90d', '1y', 'all'] as const
export type BodyWeightChartRange = (typeof BODY_WEIGHT_CHART_RANGES)[number]

const RANGE_DAYS: Readonly<Record<Exclude<BodyWeightChartRange, 'all'>, number>> = {
  '30d': 30,
  '90d': 90,
  '1y': 365,
}

/**
 * 趨勢圖區間內的點，由舊到新，每一點帶 7 日平均。平均以全部體重計算，
 * 所以區間最前面幾筆的平均仍然包含區間之前的體重，不會因為切區間而改變。
 * `entries` 不需事先排序。
 */
export function buildBodyWeightChart(
  entries: readonly BodyWeightEntry[],
  range: BodyWeightChartRange,
  today: LocalDate,
): BodyWeightTrendEntry[] {
  const trend = buildBodyWeightTrend(entries).sort((a, b) => a.date.localeCompare(b.date))
  if (range === 'all') return trend
  const start = addDays(today, -(RANGE_DAYS[range] - 1))
  return trend.filter((entry) => entry.date >= start && entry.date <= today)
}
