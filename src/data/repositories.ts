// Repository 介面（PRD §8.3）：feature 只透過這些介面存取資料，不直接操作 Dexie table。
// 介面設計成可替換，未來接雲端同步時只換實作。
import type {
  BackupData,
  CustomExercise,
  ExerciseBase,
  LibraryExercise,
  LocalDate,
  Settings,
  Workout,
} from '@/domain'

export interface WorkoutRepository {
  getByDate(date: LocalDate): Promise<Workout | undefined>
  /** 新增或覆寫該日期的訓練；衍生欄位由實作自動推導 */
  save(workout: Workout): Promise<void>
  /**
   * 在單一 transaction 中讀取該日期的訓練（沒有時為 undefined）、套用 `change` 後寫回；
   * 衍生欄位由實作自動推導。連續快速編輯時用這個方法，才不會以過時的資料覆寫掉前一次的變更。
   */
  update(date: LocalDate, change: (current: Workout | undefined) => Workout): Promise<void>
  delete(date: LocalDate): Promise<void>
  /** 列出包含該動作的訓練，由新到舊；`before` 不含當天 */
  listByExercise(
    exerciseId: string,
    options?: { before?: LocalDate; limit?: number; offset?: number },
  ): Promise<Workout[]>
  /** 列出區間內（含頭尾）有訓練的日期 */
  listDatesInRange(from: LocalDate, to: LocalDate): Promise<LocalDate[]>
  hasAnyWithExercise(exerciseId: string): Promise<boolean>
}

/** 新增或編輯自訂動作時的欄位 */
export type CustomExerciseInput = Omit<ExerciseBase, 'id'>

export interface ExerciseRepository {
  /** 合併預設動作與自訂動作後列出全部動作（含已隱藏、已封存）；預設動作在前，順序同預設動作庫 */
  listAll(): Promise<LibraryExercise[]>
  hidePreset(presetId: string): Promise<void>
  unhidePreset(presetId: string): Promise<void>
  createCustom(input: CustomExerciseInput): Promise<CustomExercise>
  updateCustom(id: string, input: CustomExerciseInput): Promise<void>
  archiveCustom(id: string): Promise<void>
  unarchiveCustom(id: string): Promise<void>
  deleteCustom(id: string): Promise<void>
}

export interface SettingsRepository {
  /** 尚未儲存過設定時回傳預設值 */
  get(): Promise<Settings>
  update(patch: Partial<Settings>): Promise<void>
}

export interface BackupRepository {
  exportAll(): Promise<BackupData>
  /** 在單一 transaction 中以匯入內容整份取代現有資料 */
  replaceAll(data: BackupData): Promise<void>
}

export interface Repositories {
  workouts: WorkoutRepository
  exercises: ExerciseRepository
  settings: SettingsRepository
  backup: BackupRepository
}
