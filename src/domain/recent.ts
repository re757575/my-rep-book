import { isHiddenOrArchived } from './library'
import type { LibraryExercise, Workout } from './types'

/** 加入動作選單「最近使用」的數量上限 */
export const RECENT_EXERCISES_LIMIT = 8

/**
 * 最近使用的動作：依最近一次使用的日期由新到舊排序並去除重複，最多 `limit` 個。
 * 同一天的動作，越後面做的排越前面。已隱藏、已封存或動作庫中找不到的動作不列入，
 * 由更早使用的動作遞補。`workouts` 不需事先排序。
 */
export function getRecentExercises<T extends LibraryExercise>(
  workouts: readonly Workout[],
  library: readonly T[],
  limit = RECENT_EXERCISES_LIMIT,
): T[] {
  const byId = new Map(library.map((exercise) => [exercise.id, exercise]))
  const newestFirst = [...workouts].sort((a, b) => b.date.localeCompare(a.date))
  const recent = new Map<string, T>()

  for (const workout of newestFirst) {
    for (const { exerciseId } of workout.exercises.toReversed()) {
      if (recent.size >= limit) return [...recent.values()]
      const exercise = byId.get(exerciseId)
      if (exercise && !isHiddenOrArchived(exercise)) recent.set(exerciseId, exercise)
    }
  }
  return [...recent.values()]
}
