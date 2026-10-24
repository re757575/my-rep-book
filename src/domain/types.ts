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

/**
 * 動作庫中的動作：預設動作加上使用者設定的「已隱藏」狀態；自訂動作本身帶有「已封存」狀態。
 */
export type LibraryExercise = (PresetExercise & { hidden: boolean }) | CustomExercise

/** 本地時區日期字串，格式 YYYY-MM-DD */
export type LocalDate = string

/**
 * 組的數值，依記錄類型區分。欄位為 null 表示「尚未填寫」，該組為不完整的組，
 * 不計入摘要與上次紀錄。values.type 必須等於所屬動作的 trackingType。
 */
export type SetValues =
  | { type: 'weight_reps'; weightKg: number | null; reps: number | null }
  | { type: 'reps'; reps: number | null; addedWeightKg: number | null }
  | { type: 'duration'; durationSec: number | null }
  | { type: 'distance_duration'; distanceKm: number | null; durationSec: number | null }

/**
 * 解析使用者在組的欄位輸入的文字：空白為 null（尚未填寫）；
 * 不合法時帶錯誤訊息，呼叫端不寫入，保留上一個合法值。
 */
export type ParsedInput = { ok: true; value: number | null } | { ok: false; error: string }

/** 組 */
export interface WorkoutSet {
  /** UUID */
  id: string
  isWarmup: boolean
  values: SetValues
}

/** 訓練動作：某次訓練中的一個動作 */
export interface WorkoutExercise {
  /** UUID */
  id: string
  exerciseId: string
  /** 空字串表示無備註 */
  note: string
  /** 陣列順序即組的順序 */
  sets: WorkoutSet[]
}

/** 訓練：一天一筆 */
export interface Workout {
  /** 主鍵 */
  date: LocalDate
  /** 陣列順序即動作順序；至少 1 個，空了就刪除整筆訓練 */
  exercises: WorkoutExercise[]
  createdAt: Timestamp
  updatedAt: Timestamp
}

export const WEIGHT_UNITS = ['kg', 'lb'] as const
export type WeightUnit = (typeof WEIGHT_UNITS)[number]

export const THEMES = ['system', 'light', 'dark'] as const
export type Theme = (typeof THEMES)[number]

/** 設定 */
export interface Settings {
  weightUnit: WeightUnit
  theme: Theme
  lastExportedAt: Timestamp | null
}

/** 備份內容：匯出檔的 data，也是匯入時整份取代的內容 */
export interface BackupData {
  /** 不含衍生欄位 */
  workouts: Workout[]
  customExercises: CustomExercise[]
  hiddenPresetIds: string[]
  settings: Omit<Settings, 'lastExportedAt'>
}
