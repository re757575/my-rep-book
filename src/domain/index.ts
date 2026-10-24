// Domain 模組進入點：只放純 TypeScript（型別、規則、計算），不得 import React、Dexie 或 feature 模組。
export * from './types'
export { PRESET_EXERCISES } from './presets'
export { CATEGORY_MUSCLES, exercisesInCategory } from './categories'
export { filterExercises, matchesSearch, type CategoryFilter } from './search'
export {
  BROWSE_CATEGORY_LABELS,
  EQUIPMENT_LABELS,
  MUSCLE_LABELS,
  TRACKING_TYPE_LABELS,
} from './labels'
export { isHiddenOrArchived } from './library'
export { hasDuplicateName, normalizeExerciseName } from './naming'
