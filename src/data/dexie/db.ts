import { Dexie, type EntityTable } from 'dexie'
import { migrateWorkoutSetTypes } from '@/domain'
import type { BodyWeightEntry, CustomExercise, Settings, Workout } from '@/domain'

/** workouts 的一列：加上衍生欄位 exerciseIds（multiEntry 索引），由 repository 寫入時推導 */
export type WorkoutRow = Workout & { exerciseIds: string[] }

/** customExercises 的一列：加上 nameKey（正規化後的中文名稱，用於檢查重名） */
export type CustomExerciseRow = CustomExercise & { nameKey: string }

export interface HiddenPresetRow {
  id: string
}

/** settings 只存一筆，key 固定為 'settings'；v1 時存的列沒有 heightCm */
export type SettingsRow = Settings & { key: 'settings' }

export type MyRepBookDb = Dexie & {
  workouts: EntityTable<WorkoutRow, 'date'>
  customExercises: EntityTable<CustomExerciseRow, 'id'>
  hiddenPresets: EntityTable<HiddenPresetRow, 'id'>
  settings: EntityTable<SettingsRow, 'key'>
  bodyWeights: EntityTable<BodyWeightEntry, 'date'>
}

export const DB_NAME = 'my-rep-book'

/** IndexedDB schema（PRD §5.6） */
export function createDb(name = DB_NAME): MyRepBookDb {
  const db = new Dexie(name) as MyRepBookDb
  // v1：一次建好 MVP 的 4 張資料表
  db.version(1).stores({
    workouts: 'date, *exerciseIds',
    customExercises: 'id, nameKey',
    hiddenPresets: 'id',
    settings: 'key',
  })
  // v2：新增體重；其他資料表沿用 v1
  db.version(2).stores({ bodyWeights: 'date' })
  // v3：組的 isWarmup 換成 setType（US-37）；資料表與索引不變，只轉換 workouts 每一組的欄位
  db.version(3)
    .stores({})
    .upgrade((transaction) =>
      transaction
        .table('workouts')
        .toCollection()
        .modify((row: WorkoutRow) => {
          row.exercises = (migrateWorkoutSetTypes(row) as WorkoutRow).exercises
        }),
    )
  return db
}

/** App 共用的資料庫連線 */
export const db = createDb()
