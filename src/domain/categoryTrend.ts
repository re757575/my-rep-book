import { addDays } from './dates'
import { periodRange, summarizePeriod } from './periodStats'
import type { CategoryFilter } from './search'
import type { ExerciseBase, LocalDate, Workout } from './types'

/** 組數趨勢可選的區間（週數） */
export const TREND_WEEKS = [12, 26, 52] as const
export type TrendWeeks = (typeof TREND_WEEKS)[number]

/** 趨勢上的一個點：某一週（以週一代表）所選部位的正式組數 */
export interface WeeklySetPoint {
  weekStart: LocalDate
  sets: number
}

/** 趨勢的區間（含頭尾）：`weeks` 週前的週一，到今天所在那一週的週日（US-47） */
export function trendRange(weeks: number, today: LocalDate): [LocalDate, LocalDate] {
  const [thisMonday, thisSunday] = periodRange('week', today)
  return [addDays(thisMonday, -7 * (weeks - 1)), thisSunday]
}

/**
 * 每週所選部位的正式組數，由舊到新，共 `weeks` 個點，最後一點是今天所在的那一週。
 * 沒有訓練的週是 0；計算方式同每週統計（`summarizePeriod`）：已完成的完整正式組，
 * 依動作的主要部位歸類，一個動作屬於多個分類時各算一次；`'all'` 是所有正式組。
 * 區間之外的訓練略過。
 */
export function buildCategoryTrend(
  workouts: readonly Workout[],
  exercisesById: ReadonlyMap<string, Pick<ExerciseBase, 'primaryMuscles'>>,
  category: CategoryFilter,
  weeks: number,
  today: LocalDate,
): WeeklySetPoint[] {
  const [from, to] = trendRange(weeks, today)
  const byWeek = new Map<LocalDate, Workout[]>()
  for (const workout of workouts) {
    if (workout.date < from || workout.date > to) continue
    const weekStart = periodRange('week', workout.date)[0]
    byWeek.set(weekStart, [...(byWeek.get(weekStart) ?? []), workout])
  }

  return Array.from({ length: weeks }, (_, index) => {
    const weekStart = addDays(from, 7 * index)
    const stats = summarizePeriod(byWeek.get(weekStart) ?? [], exercisesById)
    return {
      weekStart,
      sets: category === 'all' ? stats.workingSetCount : stats.setsByCategory[category],
    }
  })
}

/**
 * 不含最後一個點（今天所在的週，還沒結束，算進去會把平均拉低）的平均組數；
 * 沒有其他的週時回傳 undefined。
 */
export function averageOfCompletedWeeks(points: readonly WeeklySetPoint[]): number | undefined {
  const completed = points.slice(0, -1)
  if (completed.length === 0) return undefined
  return completed.reduce((total, point) => total + point.sets, 0) / completed.length
}
