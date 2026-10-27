import { isWorkingSet } from './setTypes'
import { emptySetValues, isCompleteSet } from './setValues'
import type { LocalDate, SetValues, TrackingType, Workout, WorkoutSet } from './types'

/** 上次紀錄：那一天的日期，以及該動作所有完整的正式組（依原本的順序），至少 1 組 */
export interface LastPerformance {
  date: LocalDate
  sets: SetValues[]
}

/**
 * 上次紀錄：在 `beforeDate` 之前（不含當天），最近一筆包含這個動作的訓練中，該動作所有完整的正式組。
 * 那一筆訓練中這個動作沒有任何完整的正式組時，沒有上次紀錄（不再往前找更早的訓練）。
 * `workouts` 不需事先排序，也可以包含其他動作或其他日期的訓練。
 */
export function findLastPerformance(
  workouts: readonly Workout[],
  exerciseId: string,
  beforeDate: LocalDate,
): LastPerformance | undefined {
  let last: Workout | undefined
  for (const workout of workouts) {
    if (workout.date >= beforeDate) continue
    if (!workout.exercises.some((item) => item.exerciseId === exerciseId)) continue
    if (!last || workout.date > last.date) last = workout
  }
  if (!last) return undefined

  const sets = last.exercises
    .filter((item) => item.exerciseId === exerciseId)
    .flatMap((item) => item.sets)
    .filter((set) => isWorkingSet(set) && isCompleteSet(set.values))
    .map((set) => set.values)
  return sets.length > 0 ? { date: last.date, sets } : undefined
}

/**
 * 第一組預填：帶入上次紀錄中第一個完整的正式組，並設為正式組。
 * 沒有上次紀錄（或上次紀錄的記錄類型和動作不同）時，所有欄位為 null。
 */
export function buildInitialSet(
  lastPerformance: LastPerformance | undefined,
  trackingType: TrackingType,
): Omit<WorkoutSet, 'id'> {
  const first = lastPerformance?.sets[0]
  const values = first?.type === trackingType ? { ...first } : emptySetValues(trackingType)
  return { setType: 'regular', values }
}

/**
 * 每個正式組對照的上次那一組：第 N 個正式組對照上次紀錄的第 N 個正式組（依順序，不看內容）。
 * key 是組的 ID；熱身組、超出上次組數的組、沒有上次紀錄、記錄類型和上次不同的組不出現。
 * 不完整的正式組也算，這樣新增一組後就看得到這組上次做多少。
 */
export function pairSetsWithLast(
  sets: readonly WorkoutSet[],
  lastPerformance: LastPerformance | undefined,
): Map<string, SetValues> {
  const pairs = new Map<string, SetValues>()
  if (!lastPerformance) return pairs
  let position = 0
  for (const set of sets) {
    if (!isWorkingSet(set)) continue
    const last = lastPerformance.sets[position++]
    if (last && last.type === set.values.type) pairs.set(set.id, last)
  }
  return pairs
}
