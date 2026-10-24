import { Dexie, type EntityTable } from 'dexie'
import type { CustomExercise, Settings, Workout } from '@/domain'

/** workouts 的一列：加上衍生欄位 exerciseIds（multiEntry 索引），由 repository 寫入時推導 */
export type WorkoutRow = Workout & { exerciseIds: string[] }

/** customExercises 的一列：加上 nameKey（正規化後的中文名稱，用於檢查重名） */
export type CustomExerciseRow = CustomExercise & { nameKey: string }

export interface HiddenPresetRow {
  id: string
}

/** settings 只存一筆，key 固定為 'settings' */
export type SettingsRow = Settings & { key: 'settings' }

export type MyRepBookDb = Dexie & {
  workouts: EntityTable<WorkoutRow, 'date'>
  customExercises: EntityTable<CustomExerciseRow, 'id'>
  hiddenPresets: EntityTable<HiddenPresetRow, 'id'>
  settings: EntityTable<SettingsRow, 'key'>
}

export const DB_NAME = 'my-rep-book'

/** IndexedDB schema v1（PRD §5.6）：一次建好全部 4 張資料表 */
export function createDb(name = DB_NAME): MyRepBookDb {
  const db = new Dexie(name) as MyRepBookDb
  db.version(1).stores({
    workouts: 'date, *exerciseIds',
    customExercises: 'id, nameKey',
    hiddenPresets: 'id',
    settings: 'key',
  })
  return db
}

/** App 共用的資料庫連線 */
export const db = createDb()
