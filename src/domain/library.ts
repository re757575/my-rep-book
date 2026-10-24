import type { LibraryExercise } from './types'

/** 已隱藏的預設動作或已封存的自訂動作：不出現在選單中，只有開啟「顯示已隱藏／已封存」時才列出 */
export function isHiddenOrArchived(exercise: LibraryExercise): boolean {
  return exercise.source === 'preset' ? exercise.hidden : exercise.archived
}
