import { summarizeWorkout } from './summary'
import type { Workout } from './types'

/**
 * 月曆標點的級別（US-48）：依當天的正式組數分成少、中、多；
 * 沒有任何已完成的完整正式組（例如只從範本加入還沒做，或只有熱身組）是「未完成」
 */
export type DayLevel = 'none' | 'low' | 'medium' | 'high'

/** 各級別的組數範圍（含頭尾），給圖例顯示；級別只看當天的組數，與其他日子無關 */
export const DAY_LEVEL_RANGES = {
  low: [1, 8],
  medium: [9, 16],
  high: [17, Infinity],
} as const satisfies Record<Exclude<DayLevel, 'none'>, readonly [number, number]>

/** 當天的標點級別，依每日摘要的正式組數（已完成的完整正式組，US-09、US-44） */
export function dayLevel(workout: Workout): DayLevel {
  const { workingSetCount } = summarizeWorkout(workout)
  if (workingSetCount === 0) return 'none'
  if (workingSetCount <= DAY_LEVEL_RANGES.low[1]) return 'low'
  if (workingSetCount <= DAY_LEVEL_RANGES.medium[1]) return 'medium'
  return 'high'
}
