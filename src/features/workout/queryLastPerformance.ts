import type { WorkoutRepository } from '@/data'
import { findLastPerformance, type LastPerformance, type LocalDate } from '@/domain'

/** 某個動作在 `date` 之前（不含當天）的上次紀錄；沒有時為 undefined */
export async function queryLastPerformance(
  workouts: WorkoutRepository,
  exerciseId: string,
  date: LocalDate,
): Promise<LastPerformance | undefined> {
  const latest = await workouts.listByExercise(exerciseId, { before: date, limit: 1 })
  return findLastPerformance(latest, exerciseId, date)
}
