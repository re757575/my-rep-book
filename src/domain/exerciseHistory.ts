import type { LocalDate, Workout, WorkoutSet } from './types'

/** 動作歷史中的一筆：某一天這個動作的所有組（含熱身組，依原本的順序）與備註 */
export interface ExerciseHistoryEntry {
  date: LocalDate
  sets: WorkoutSet[]
  /** 非空白的備註；同一天加入多次這個動作時，依動作順序各一則 */
  notes: string[]
}

/**
 * 把包含這個動作的訓練轉成動作歷史，由新到舊。
 * 同一天加入多次這個動作時合併成一筆，組與備註依動作順序串接；不含這個動作的訓練略過。
 */
export function buildExerciseHistory(
  workouts: readonly Workout[],
  exerciseId: string,
): ExerciseHistoryEntry[] {
  const entries: ExerciseHistoryEntry[] = []
  for (const workout of workouts) {
    const items = workout.exercises.filter((item) => item.exerciseId === exerciseId)
    if (items.length === 0) continue
    entries.push({
      date: workout.date,
      sets: items.flatMap((item) => item.sets),
      notes: items.map((item) => item.note).filter((note) => note.trim() !== ''),
    })
  }
  return entries.sort((a, b) => b.date.localeCompare(a.date))
}
