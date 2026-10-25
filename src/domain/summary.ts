import { isCompleteSet } from './setValues'
import type { Workout } from './types'

/** 每日摘要 */
export interface WorkoutSummary {
  /** 動作數：同一個動作加入多次只算一個 */
  exerciseCount: number
  /** 正式組數：所有記錄類型的完整正式組 */
  workingSetCount: number
  /** 總訓練量（kg）：只算 weight_reps 的重量 × 次數；reps 類型的額外負重不計入 */
  volumeKg: number
  /** 有氧總時間（秒）：只算 distance_duration 的時間；duration 類型不計入 */
  cardioDurationSec: number
}

function sum(numbers: number[]) {
  return numbers.reduce((total, value) => total + value, 0)
}

/** 每日摘要：不完整的組與熱身組不計入任何一項 */
export function summarizeWorkout(workout: Workout): WorkoutSummary {
  const workingSets = workout.exercises
    .flatMap((item) => item.sets)
    .filter((set) => !set.isWarmup && isCompleteSet(set.values))
  return {
    exerciseCount: new Set(workout.exercises.map((item) => item.exerciseId)).size,
    workingSetCount: workingSets.length,
    volumeKg: sum(
      workingSets.map(({ values }) =>
        values.type === 'weight_reps' ? (values.weightKg ?? 0) * (values.reps ?? 0) : 0,
      ),
    ),
    cardioDurationSec: sum(
      workingSets.map(({ values }) =>
        values.type === 'distance_duration' ? (values.durationSec ?? 0) : 0,
      ),
    ),
  }
}
