import type { Repositories } from '../repositories'
import { createDexieBackupRepository } from './backupRepository'
import type { MyRepBookDb } from './db'
import { createDexieExerciseRepository } from './exerciseRepository'
import { createDexieSettingsRepository } from './settingsRepository'
import { createDexieWorkoutRepository } from './workoutRepository'

export { db } from './db'

export function createDexieRepositories(db: MyRepBookDb): Repositories {
  return {
    workouts: createDexieWorkoutRepository(db),
    exercises: createDexieExerciseRepository(db),
    settings: createDexieSettingsRepository(db),
    backup: createDexieBackupRepository(db),
  }
}
