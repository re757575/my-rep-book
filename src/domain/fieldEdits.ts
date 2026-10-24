import type { SetField } from './setValues'
import type { LocalDate, Timestamp, Workout } from './types'
import { updateSetValues, updateWorkoutExerciseNote } from './workoutEdits'

/**
 * 「輸入即儲存」的欄位編輯：把某個欄位改成某個值。
 * 只含可序列化的資料，頁面在寫入完成前被中斷時，可以存在本機、下次開啟時補寫。
 */
export type FieldEdit =
  | {
      kind: 'setValue'
      date: LocalDate
      workoutExerciseId: string
      setId: string
      field: SetField
      value: number | null
    }
  | { kind: 'note'; date: LocalDate; workoutExerciseId: string; note: string }

/** 同一個欄位的編輯有相同的 key */
function fieldKey(edit: FieldEdit): string {
  switch (edit.kind) {
    case 'setValue':
      return [edit.kind, edit.date, edit.workoutExerciseId, edit.setId, edit.field].join('|')
    case 'note':
      return [edit.kind, edit.date, edit.workoutExerciseId].join('|')
  }
}

/** 把編輯加入待寫清單；同一個欄位已有待寫的值時，以最後的值為準 */
export function queueFieldEdit(pending: readonly FieldEdit[], edit: FieldEdit): FieldEdit[] {
  const key = fieldKey(edit)
  return [...pending.filter((item) => fieldKey(item) !== key), edit]
}

/** 套用一個編輯；該組或訓練動作已不存在、欄位不屬於該組的記錄類型時，訓練不變 */
function applyFieldEdit(workout: Workout, edit: FieldEdit, now: Timestamp): Workout {
  const target = workout.exercises.find((item) => item.id === edit.workoutExerciseId)
  if (edit.date !== workout.date || !target) return workout
  switch (edit.kind) {
    case 'note':
      return updateWorkoutExerciseNote(workout, edit.workoutExerciseId, edit.note, now)
    case 'setValue': {
      const set = target.sets.find((item) => item.id === edit.setId)
      if (!set || !(edit.field in set.values)) return workout
      return updateSetValues(
        workout,
        edit.workoutExerciseId,
        edit.setId,
        (values) => ({ ...values, [edit.field]: edit.value }),
        now,
      )
    }
  }
}

/** 依序把待寫的編輯套用到該日的訓練；套用不到的編輯（例如該組已被刪除）略過 */
export function applyFieldEdits(
  workout: Workout,
  edits: readonly FieldEdit[],
  now: Timestamp,
): Workout {
  return edits.reduce((current, edit) => applyFieldEdit(current, edit, now), workout)
}

function editedValue(edit: FieldEdit): number | string | null {
  return edit.kind === 'setValue' ? edit.value : edit.note
}

/**
 * 寫入完成後，從待寫清單移除已寫入的編輯。
 * 寫入期間又改成別的值的欄位保留新的值，等下一次寫入。
 */
export function settleFieldEdits(
  pending: readonly FieldEdit[],
  written: readonly FieldEdit[],
): FieldEdit[] {
  return pending.filter(
    (item) =>
      !written.some(
        (done) => fieldKey(done) === fieldKey(item) && editedValue(done) === editedValue(item),
      ),
  )
}
