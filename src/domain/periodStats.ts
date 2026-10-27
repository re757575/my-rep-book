import { isWorkingSet } from './setTypes'
import { CATEGORY_MUSCLES } from './categories'
import { addDays, fromLocalDate, toLocalDate } from './dates'
import { isCompleteSet } from './setValues'
import { summarizeWorkout } from './summary'
import {
  BROWSE_CATEGORIES,
  type BrowseCategory,
  type ExerciseBase,
  type LocalDate,
  type Workout,
} from './types'

/** 統計區間：週一到週日，或一個月 */
export type StatsPeriod = 'week' | 'month'

/** 一段期間的訓練統計 */
export interface PeriodStats {
  /** 有訓練的天數 */
  trainingDays: number
  /** 正式組數：所有記錄類型的完整正式組 */
  workingSetCount: number
  /** 總訓練量（kg）：只算 weight_reps，同每日摘要 */
  volumeKg: number
  /** 各分類的正式組數；依動作的主要部位歸類，一個動作屬於多個分類時每個分類各算一次 */
  setsByCategory: Record<BrowseCategory, number>
}

/** 包含 `date` 的區間（含頭尾）：週為週一到週日，與歷史月曆一致 */
export function periodRange(period: StatsPeriod, date: LocalDate): [LocalDate, LocalDate] {
  if (period === 'month') {
    const [year, month] = date.split('-').map(Number)
    // 下個月的第 0 天就是這個月的最後一天
    return [`${date.slice(0, 7)}-01`, toLocalDate(new Date(year, month, 0, 12))]
  }
  // getDay()：週日為 0，換成週一為 0
  const daysSinceMonday = (fromLocalDate(date).getDay() + 6) % 7
  const monday = addDays(date, -daysSinceMonday)
  return [monday, addDays(monday, 6)]
}

/** 動作所屬的分類（只看主要部位，同動作庫的分類篩選） */
function categoriesOf(exercise: Pick<ExerciseBase, 'primaryMuscles'>): BrowseCategory[] {
  return BROWSE_CATEGORIES.filter((category) =>
    exercise.primaryMuscles.some((muscle) => CATEGORY_MUSCLES[category].includes(muscle)),
  )
}

/**
 * 統計一段期間的訓練。不完整的組與熱身組不計入；
 * `exercisesById` 找不到的動作仍計入組數與訓練量，但不歸入任何分類。
 */
export function summarizePeriod(
  workouts: readonly Workout[],
  exercisesById: ReadonlyMap<string, Pick<ExerciseBase, 'primaryMuscles'>>,
): PeriodStats {
  const setsByCategory = Object.fromEntries(
    BROWSE_CATEGORIES.map((category) => [category, 0]),
  ) as Record<BrowseCategory, number>
  let workingSetCount = 0
  let volumeKg = 0

  for (const workout of workouts) {
    const summary = summarizeWorkout(workout)
    workingSetCount += summary.workingSetCount
    volumeKg += summary.volumeKg
    for (const item of workout.exercises) {
      const exercise = exercisesById.get(item.exerciseId)
      if (!exercise) continue
      const count = item.sets.filter((set) => isWorkingSet(set) && isCompleteSet(set.values)).length
      for (const category of categoriesOf(exercise)) setsByCategory[category] += count
    }
  }

  return { trainingDays: workouts.length, workingSetCount, volumeKg, setsByCategory }
}
