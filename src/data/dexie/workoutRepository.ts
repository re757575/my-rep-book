import type { WorkoutRepository } from '../repositories'
import type { MyRepBookDb } from './db'
import { notImplemented } from './notImplemented'

export function createDexieWorkoutRepository(_db: MyRepBookDb): WorkoutRepository {
  return {
    getByDate: notImplemented('WorkoutRepository.getByDate'),
    save: notImplemented('WorkoutRepository.save'),
    delete: notImplemented('WorkoutRepository.delete'),
    listByExercise: notImplemented('WorkoutRepository.listByExercise'),
    listDatesInRange: notImplemented('WorkoutRepository.listDatesInRange'),
    hasAnyWithExercise: notImplemented('WorkoutRepository.hasAnyWithExercise'),
  }
}
