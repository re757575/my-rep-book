/** ISO 8601 時間戳記（UTC），例如 2026-10-24T04:43:00.000Z */
export type Timestamp = string

/** 記錄類型：決定一組要記錄哪些欄位 */
export const TRACKING_TYPES = ['weight_reps', 'reps', 'duration', 'distance_duration'] as const
export type TrackingType = (typeof TRACKING_TYPES)[number]

/** 部位：細分的肌群，用於資料層 */
export const MUSCLES = [
  'chest',
  'back',
  'shoulders',
  'traps',
  'biceps',
  'triceps',
  'forearms',
  'quads',
  'glutes',
  'hamstrings',
  'calves',
  'core',
  'full_body',
] as const
export type Muscle = (typeof MUSCLES)[number]

/** 器材 */
export const EQUIPMENTS = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
  'cardio_machine',
  'other',
] as const
export type Equipment = (typeof EQUIPMENTS)[number]

/** 篩選分類：畫面上用來篩選動作的 10 大類，由主要部位映射而來（陣列順序即畫面順序） */
export const BROWSE_CATEGORIES = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads_glutes',
  'hamstrings',
  'calves',
  'core',
  'cardio_full_body',
] as const
export type BrowseCategory = (typeof BROWSE_CATEGORIES)[number]

export interface ExerciseBase {
  /** 預設動作：固定 slug，例如 'barbell-bench-press'；自訂動作：'custom-' + UUID */
  id: string
  nameZh: string
  nameEn: string | null
  /** 至少 1 個 */
  primaryMuscles: readonly Muscle[]
  /** 不可與 primaryMuscles 重複 */
  secondaryMuscles: readonly Muscle[]
  equipment: Equipment
  trackingType: TrackingType
}

/** 預設動作：寫在程式碼中的常數，不存入 IndexedDB */
export interface PresetExercise extends ExerciseBase {
  source: 'preset'
}

/** 自訂動作：存於 IndexedDB */
export interface CustomExercise extends ExerciseBase {
  source: 'custom'
  archived: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type Exercise = PresetExercise | CustomExercise
