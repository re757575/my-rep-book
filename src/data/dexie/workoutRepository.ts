import type { Workout } from '@/domain'
import type { WorkoutRepository } from '../repositories'
import type { MyRepBookDb, WorkoutRow } from './db'
import { notImplemented } from './notImplemented'

/** 寫入時推導衍生欄位 exerciseIds：這筆訓練包含的動作 ID（去除重複） */
function toRow(workout: Workout): WorkoutRow {
  const exerciseIds = [...new Set(workout.exercises.map((exercise) => exercise.exerciseId))]
  return { ...workout, exerciseIds }
}

function toWorkout({ exerciseIds: _exerciseIds, ...workout }: WorkoutRow): Workout {
  return workout
}

export function createDexieWorkoutRepository(db: MyRepBookDb): WorkoutRepository {
  return {
    async getByDate(date) {
      const row = await db.workouts.get(date)
      return row && toWorkout(row)
    },

    async save(workout) {
      await db.transaction('rw', db.workouts, () => db.workouts.put(toRow(workout)))
    },

    async update(date, change) {
      await db.transaction('rw', db.workouts, async () => {
        const row = await db.workouts.get(date)
        const next = change(row && toWorkout(row))
        if (next) await db.workouts.put(toRow(next))
        else await db.workouts.delete(date)
      })
    },

    delete: notImplemented('WorkoutRepository.delete'),
    listByExercise: notImplemented('WorkoutRepository.listByExercise'),
    listDatesInRange: notImplemented('WorkoutRepository.listDatesInRange'),

    async hasAnyWithExercise(exerciseId) {
      return (await db.workouts.where('exerciseIds').equals(exerciseId).count()) > 0
    },
  }
}
