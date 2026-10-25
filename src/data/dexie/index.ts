import type { Repositories } from '../repositories'
import { createDexieBackupRepository } from './backupRepository'
import type { MyRepBookDb } from './db'
import { createDexieExerciseRepository } from './exerciseRepository'
import { createLocalStoragePendingFieldEdits } from './pendingFieldEdits'
import { createDexieSettingsRepository } from './settingsRepository'
import { createDexieWorkoutRepository } from './workoutRepository'

export { db } from './db'

export function createDexieRepositories(db: MyRepBookDb): Repositories {
  // 待寫的欄位編輯由訓練寫入，匯出前要先寫入、匯入後要清空，兩者共用同一份
  const pending = createLocalStoragePendingFieldEdits()
  const workouts = createDexieWorkoutRepository(db, pending)
  return {
    workouts,
    exercises: createDexieExerciseRepository(db),
    settings: createDexieSettingsRepository(db),
    backup: createDexieBackupRepository(db, { workouts, pending }),
  }
}
