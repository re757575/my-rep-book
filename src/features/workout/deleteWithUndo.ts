import { toast } from 'sonner'
import type { WorkoutRepository } from '@/data'
import {
  removeSet,
  removeWorkoutExercise,
  restoreSet,
  restoreWorkoutExercise,
  type LocalDate,
  type RemovedSet,
  type RemovedWorkoutExercise,
} from '@/domain'

/** 刪除後可以「復原」的時間（毫秒） */
const UNDO_DURATION_MS = 5000

function now() {
  return new Date().toISOString()
}

/** 顯示可以復原的 toast */
function showUndoToast(message: string, undo: () => Promise<void>) {
  toast(message, {
    duration: UNDO_DURATION_MS,
    action: { label: '復原', onClick: () => void undo() },
  })
}

/** 直接刪除一組（不跳確認視窗），並顯示可以復原的 toast */
export async function deleteSetWithUndo(
  workouts: WorkoutRepository,
  date: LocalDate,
  workoutExerciseId: string,
  setId: string,
) {
  // 在 transaction 中取出被刪除的組，復原時才會是刪除當下的最新數值
  const deleted: { set?: RemovedSet } = {}
  await workouts.update(date, (current) => {
    if (!current) return current
    const result = removeSet(current, workoutExerciseId, setId, now())
    deleted.set = result.removed
    return result.workout
  })

  const removed = deleted.set
  if (!removed) return
  showUndoToast('已刪除一組', () =>
    workouts.update(date, (current) => current && restoreSet(current, removed, now())),
  )
}

/**
 * 直接刪除一個訓練動作（不跳確認視窗），並顯示可以復原的 toast。
 * 刪除的是最後一個動作時，整筆訓練一併刪除；復原時一併還原。
 */
export async function deleteWorkoutExerciseWithUndo(
  workouts: WorkoutRepository,
  date: LocalDate,
  workoutExerciseId: string,
  exerciseName: string,
) {
  const deleted: { workoutExercise?: RemovedWorkoutExercise } = {}
  await workouts.update(date, (current) => {
    if (!current) return current
    const result = removeWorkoutExercise(current, workoutExerciseId, now())
    deleted.workoutExercise = result.removed
    return result.workout
  })

  const removed = deleted.workoutExercise
  if (!removed) return
  showUndoToast(`已刪除『${exerciseName}』`, () =>
    workouts.update(date, (current) => restoreWorkoutExercise(current, date, removed, now())),
  )
}
