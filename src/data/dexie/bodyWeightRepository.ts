import type { BodyWeightRepository, WorkoutRepository } from '../repositories'
import type { MyRepBookDb } from './db'

export function createDexieBodyWeightRepository(
  db: MyRepBookDb,
  // 體重的編輯放進訓練的待寫清單，由它在寫入佇列中寫進 bodyWeights
  workouts: WorkoutRepository,
): BodyWeightRepository {
  return {
    async getByDate(date) {
      return db.bodyWeights.get(date)
    },

    async listAll() {
      return db.bodyWeights.orderBy('date').reverse().toArray()
    },

    edit(date, weightKg) {
      workouts.editField({ kind: 'bodyWeight', date, weightKg })
    },
  }
}
