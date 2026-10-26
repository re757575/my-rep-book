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
export {
  addDays,
  formatDateTime,
  formatDateTitle,
  formatDateWithYear,
  fromLocalDate,
  isValidLocalDate,
  toLocalDate,
} from './dates'
export { buildExerciseHistory, type ExerciseHistoryEntry } from './exerciseHistory'
export {
  buildExerciseRecords,
  estimateOneRepMaxKg,
  type ExerciseRecords,
  type ExerciseSessionProgress,
  type PersonalRecord,
  type WeightRepsSet,
} from './exerciseRecords'
export { formatDuration, parseDuration } from './duration'
export {
  emptySetValues,
  isCompleteSet,
  parseSetInput,
  validateSetValues,
  type SetField,
  type SetFieldErrors,
} from './setValues'
export {
  addExerciseToWorkout,
  addSetToWorkoutExercise,
  cloneSetForNext,
  moveWorkoutExercise,
  removeSet,
  removeWorkoutExercise,
  restoreSet,
  restoreWorkoutExercise,
  toggleSetWarmup,
  updateSetValues,
  updateWorkoutExerciseNote,
  type EditContext,
  type RemovedSet,
  type RemovedWorkoutExercise,
} from './workoutEdits'
export { buildInitialSet, findLastPerformance, type LastPerformance } from './lastPerformance'
export { formatLastPerformance, formatSetValues, formatWeightReps } from './formatSet'
export { applyFieldEdits, queueFieldEdit, settleFieldEdits, type FieldEdit } from './fieldEdits'
export { hasDuplicateName, normalizeExerciseName } from './naming'
export { RECENT_EXERCISES_LIMIT, getRecentExercises } from './recent'
export { summarizeWorkout, type WorkoutSummary } from './summary'
export { periodRange, summarizePeriod, type PeriodStats, type StatsPeriod } from './periodStats'
export { formatRoundedWeight, formatWeight, formatWeightChange, kgToLb, lbToKg } from './units'
export {
  calculateBmi,
  formatBmi,
  isValidBodyWeightKg,
  isValidHeightCm,
  parseBodyWeightInput,
  parseHeightInput,
} from './bodyMetrics'
export { buildBodyWeightTrend, type BodyWeightTrendEntry } from './bodyWeightTrend'
// 匯出檔的解析與驗證（./backup）用到 zod，只有設定頁需要。為了不讓 zod 進入首次載入的 JS（PRD §7），
// 不從這裡匯出，改由使用端直接 import '@/domain/backup'。
