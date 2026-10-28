import { addDays } from './dates'
import { periodRange } from './periodStats'
import type { LocalDate } from './types'

/** 訓練節奏（US-45） */
export interface TrainingRhythm {
  /** 今天所在的那一週（週一到週日）練了幾天 */
  daysThisWeek: number
  /** 目前連續幾個有訓練的週：本週有練算到本週，本週還沒練算到上週 */
  currentStreakWeeks: number
  /** 全部歷史中最長的連續週數 */
  longestStreakWeeks: number
}

/** 日期所在那一週的週一 */
function mondayOf(date: LocalDate): LocalDate {
  return periodRange('week', date)[0]
}

/**
 * 從有訓練的日期算出本週已練天數、目前連續週數與最長連續週數（US-45）。
 * `dates` 不需要排序，可以重複；晚於今天的日期（不該出現）略過。
 */
export function buildTrainingRhythm(dates: readonly LocalDate[], today: LocalDate): TrainingRhythm {
  const trainedDays = new Set(dates.filter((date) => date <= today))
  const thisMonday = mondayOf(today)
  const sunday = addDays(thisMonday, 6)
  const daysThisWeek = [...trainedDays].filter(
    (date) => date >= thisMonday && date <= sunday,
  ).length

  const weeks = [...new Set([...trainedDays].map(mondayOf))].sort()
  let longestStreakWeeks = 0
  let run = 0
  let previous: LocalDate | undefined
  for (const week of weeks) {
    run = previous !== undefined && addDays(previous, 7) === week ? run + 1 : 1
    longestStreakWeeks = Math.max(longestStreakWeeks, run)
    previous = week
  }

  // 本週還沒練時從上週往前算：本週還沒結束，不算中斷
  const weekSet = new Set(weeks)
  let cursor = weekSet.has(thisMonday) ? thisMonday : addDays(thisMonday, -7)
  let currentStreakWeeks = 0
  while (weekSet.has(cursor)) {
    currentStreakWeeks += 1
    cursor = addDays(cursor, -7)
  }

  return { daysThisWeek, currentStreakWeeks, longestStreakWeeks }
}
