import type { ExerciseBase } from './types'

/** 名稱正規化：去掉前後空白並轉小寫，用來比對是否重名 */
export function normalizeExerciseName(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * 重名檢查：正規化後的中文名稱是否和任一動作（預設＋自訂）相同。
 * 編輯自訂動作時以 `excludeId` 排除它自己。
 */
export function hasDuplicateName(
  name: string,
  exercises: readonly ExerciseBase[],
  { excludeId }: { excludeId?: string } = {},
): boolean {
  const key = normalizeExerciseName(name)
  return exercises.some(
    (exercise) => exercise.id !== excludeId && normalizeExerciseName(exercise.nameZh) === key,
  )
}
