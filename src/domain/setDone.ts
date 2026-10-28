import { isCompleteSet } from './setValues'
import type { WorkoutSet } from './types'

/**
 * 組是否算數（US-44）：沒有 `done` 欄位（不追蹤，例如手動加入的組與舊紀錄）或 `done` 為 true 都算；
 * 只有 `done` 為 false 的組是「未完成」，不計入任何摘要、統計與上次紀錄。
 */
export function isDoneSet(set: Pick<WorkoutSet, 'done'>): boolean {
  return set.done !== false
}

/** 已完成的完整組：計入摘要、統計、上次紀錄與個人紀錄的條件（正式組還要另外排除熱身組） */
export function isFinishedSet(set: Pick<WorkoutSet, 'done' | 'values'>): boolean {
  return isDoneSet(set) && isCompleteSet(set.values)
}
