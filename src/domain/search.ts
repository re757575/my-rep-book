import { exercisesInCategory } from './categories'
import type { BrowseCategory, ExerciseBase } from './types'

/** 分類篩選：「全部」或 10 大類之一 */
export type CategoryFilter = 'all' | BrowseCategory

/** 同時比對中英文名稱，忽略大小寫與前後空白，部分符合即可；空白查詢視為符合 */
export function matchesSearch(exercise: ExerciseBase, query: string): boolean {
  const needle = query.trim().toLowerCase()
  if (needle === '') return true
  return [exercise.nameZh, exercise.nameEn].some(
    (name) => name !== null && name.toLowerCase().includes(needle),
  )
}

/** 依分類篩選後再依搜尋字串比對，保留原本的動作順序 */
export function filterExercises<T extends ExerciseBase>(
  exercises: readonly T[],
  { query, category }: { query: string; category: CategoryFilter },
): T[] {
  const inCategory = category === 'all' ? exercises : exercisesInCategory(exercises, category)
  return inCategory.filter((exercise) => matchesSearch(exercise, query))
}
