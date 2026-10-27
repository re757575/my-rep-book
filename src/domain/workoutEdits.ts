import { buildInitialSet, type LastPerformance } from './lastPerformance'
import { nextSetType } from './setTypes'
import { isCompleteSet } from './setValues'
import type {
  ExerciseBase,
  LocalDate,
  SetValues,
  Timestamp,
  TrackingType,
  Workout,
  WorkoutExercise,
  WorkoutSet,
} from './types'

/** 編輯訓練時由呼叫端提供的時間與 ID，讓這些規則保持純函式 */
export interface EditContext {
  now: Timestamp
  createId: () => string
}

/** 「新增一組」：複製上一組的數值與組類型 */
export function cloneSetForNext(previousSet: WorkoutSet): Omit<WorkoutSet, 'id'> {
  return { setType: previousSet.setType, values: { ...previousSet.values } }
}

/**
 * 把動作加到訓練的最後面，並自動建立第一組（第一組預填：帶入上次紀錄的第一個完整的正式組，
 * 沒有上次紀錄時欄位為空白）。該日還沒有訓練（`workout` 為 undefined）時，建立該日的訓練。
 */
export function addExerciseToWorkout(
  workout: Workout | undefined,
  date: LocalDate,
  exercise: Pick<ExerciseBase, 'id' | 'trackingType'>,
  lastPerformance: LastPerformance | undefined,
  { now, createId }: EditContext,
): Workout {
  const added: WorkoutExercise = {
    id: createId(),
    exerciseId: exercise.id,
    note: '',
    sets: [{ id: createId(), ...buildInitialSet(lastPerformance, exercise.trackingType) }],
  }
  if (!workout) {
    return { date, exercises: [added], createdAt: now, updatedAt: now }
  }
  return { ...workout, exercises: [...workout.exercises, added], updatedAt: now }
}

function updateWorkoutExercise(
  workout: Workout,
  workoutExerciseId: string,
  change: (workoutExercise: WorkoutExercise) => WorkoutExercise,
  now: Timestamp,
): Workout {
  return {
    ...workout,
    exercises: workout.exercises.map((item) =>
      item.id === workoutExerciseId ? change(item) : item,
    ),
    updatedAt: now,
  }
}

/**
 * 「新增一組」：複製本次最後一組的數值與組類型；
 * 這個動作目前沒有任何組時，改用第一組預填的規則（依上次紀錄，沒有時欄位為空白）。
 */
export function addSetToWorkoutExercise(
  workout: Workout,
  workoutExerciseId: string,
  trackingType: TrackingType,
  lastPerformance: LastPerformance | undefined,
  { now, createId }: EditContext,
): Workout {
  return updateWorkoutExercise(
    workout,
    workoutExerciseId,
    (item) => {
      const lastSet = item.sets.at(-1)
      const next = lastSet
        ? cloneSetForNext(lastSet)
        : buildInitialSet(lastPerformance, trackingType)
      return { ...item, sets: [...item.sets, { id: createId(), ...next }] }
    },
    now,
  )
}

/**
 * 設定某一組的強度（RPE，US-39）；`rpe` 為 undefined 時取消，欄位一併移除。
 * 找不到該組時訓練不變。
 */
export function setSetRpe(
  workout: Workout,
  workoutExerciseId: string,
  setId: string,
  rpe: number | undefined,
  now: Timestamp,
): Workout {
  return updateWorkoutExercise(
    workout,
    workoutExerciseId,
    (item) => ({
      ...item,
      sets: item.sets.map((set) => {
        if (set.id !== setId) return set
        const { rpe: _previous, ...rest } = set
        return rpe === undefined ? rest : { ...rest, rpe }
      }),
    }),
    now,
  )
}

/** 把某一組換成下一個組類型：正式 → 熱身 → 遞減 → 力竭 → 正式（US-37） */
export function cycleSetType(
  workout: Workout,
  workoutExerciseId: string,
  setId: string,
  now: Timestamp,
): Workout {
  return updateWorkoutExercise(
    workout,
    workoutExerciseId,
    (item) => ({
      ...item,
      sets: item.sets.map((set) =>
        set.id === setId ? { ...set, setType: nextSetType(set.setType) } : set,
      ),
    }),
    now,
  )
}

/** 更新訓練動作的備註；空字串代表沒有備註 */
export function updateWorkoutExerciseNote(
  workout: Workout,
  workoutExerciseId: string,
  note: string,
  now: Timestamp,
): Workout {
  return updateWorkoutExercise(workout, workoutExerciseId, (item) => ({ ...item, note }), now)
}

/**
 * 「上移」「下移」：和相鄰的訓練動作交換位置。已經在最前面（上移）或最後面（下移）時不變。
 */
export function moveWorkoutExercise(
  workout: Workout,
  workoutExerciseId: string,
  direction: 'up' | 'down',
  now: Timestamp,
): Workout {
  const from = workout.exercises.findIndex((item) => item.id === workoutExerciseId)
  const to = direction === 'up' ? from - 1 : from + 1
  if (from === -1 || to < 0 || to >= workout.exercises.length) return workout

  const exercises = [...workout.exercises]
  ;[exercises[from], exercises[to]] = [exercises[to], exercises[from]]
  return { ...workout, exercises, updatedAt: now }
}

/**
 * 更新某一組的數值。`change` 收到該組目前的數值，只改它負責的欄位，
 * 才不會用畫面上過時的數值蓋掉其他欄位剛寫入的值。
 */
export function updateSetValues(
  workout: Workout,
  workoutExerciseId: string,
  setId: string,
  change: (values: SetValues) => SetValues,
  now: Timestamp,
): Workout {
  return updateWorkoutExercise(
    workout,
    workoutExerciseId,
    (item) => ({
      ...item,
      sets: item.sets.map((set) =>
        set.id === setId ? { ...set, values: change(set.values) } : set,
      ),
    }),
    now,
  )
}

/**
 * 把刪除的項目放回原位：接在原本排在它前面、目前仍存在的最後一個項目之後；都不在了就放最前面。
 * 以前面的項目定位而不是用索引，刪除後又刪了、加了或移動了其他項目時，相對順序仍然正確。
 */
function insertAfterPreceding<T extends { id: string }>(
  items: readonly T[],
  item: T,
  precedingIds: readonly string[],
): T[] {
  const preceding = new Set(precedingIds)
  const anchor = items.findLastIndex((candidate) => preceding.has(candidate.id))
  return items.toSpliced(anchor + 1, 0, item)
}

/** 被刪除的組，以及原本排在它前面的組（復原時用來找回原位） */
export interface RemovedSet {
  workoutExerciseId: string
  set: WorkoutSet
  precedingSetIds: string[]
}

/** 刪除一組；找不到該組時訓練不變，`removed` 為 undefined */
export function removeSet(
  workout: Workout,
  workoutExerciseId: string,
  setId: string,
  now: Timestamp,
): { workout: Workout; removed: RemovedSet | undefined } {
  const sets = workout.exercises.find((item) => item.id === workoutExerciseId)?.sets ?? []
  const index = sets.findIndex((set) => set.id === setId)
  if (index === -1) return { workout, removed: undefined }

  return {
    workout: updateWorkoutExercise(
      workout,
      workoutExerciseId,
      (item) => ({ ...item, sets: item.sets.toSpliced(index, 1) }),
      now,
    ),
    removed: {
      workoutExerciseId,
      set: sets[index],
      precedingSetIds: sets.slice(0, index).map((set) => set.id),
    },
  }
}

/**
 * 「復原」刪除的組：放回原本的位置、原本的數值。
 * 所屬的訓練動作已不存在，或該組已經復原過時，訓練不變。
 */
export function restoreSet(workout: Workout, removed: RemovedSet, now: Timestamp): Workout {
  const target = workout.exercises.find((item) => item.id === removed.workoutExerciseId)
  if (!target || target.sets.some((set) => set.id === removed.set.id)) return workout
  return updateWorkoutExercise(
    workout,
    removed.workoutExerciseId,
    (item) => ({
      ...item,
      sets: insertAfterPreceding(item.sets, removed.set, removed.precedingSetIds),
    }),
    now,
  )
}

/** 被刪除的訓練動作、原本排在它前面的動作（復原時用來找回原位），以及所屬訓練的建立時間 */
export interface RemovedWorkoutExercise {
  workoutExercise: WorkoutExercise
  precedingIds: string[]
  workoutCreatedAt: Timestamp
}

/**
 * 刪除一個訓練動作。刪除的是最後一個動作時，整筆訓練一併刪除（`workout` 為 undefined）。
 * 找不到該動作時訓練不變，`removed` 為 undefined。
 */
export function removeWorkoutExercise(
  workout: Workout,
  workoutExerciseId: string,
  now: Timestamp,
): { workout: Workout | undefined; removed: RemovedWorkoutExercise | undefined } {
  const index = workout.exercises.findIndex((item) => item.id === workoutExerciseId)
  if (index === -1) return { workout, removed: undefined }

  const exercises = workout.exercises.toSpliced(index, 1)
  return {
    workout: exercises.length > 0 ? { ...workout, exercises, updatedAt: now } : undefined,
    removed: {
      workoutExercise: workout.exercises[index],
      precedingIds: workout.exercises.slice(0, index).map((item) => item.id),
      workoutCreatedAt: workout.createdAt,
    },
  }
}

/**
 * 「復原」刪除的訓練動作：放回原本的位置，各組與備註和刪除前相同。
 * 整筆訓練已隨最後一個動作刪除時（`workout` 為 undefined），一併還原該日的訓練。
 * 該動作已經復原過時，訓練不變。
 */
export function restoreWorkoutExercise(
  workout: Workout | undefined,
  date: LocalDate,
  removed: RemovedWorkoutExercise,
  now: Timestamp,
): Workout {
  if (!workout) {
    return {
      date,
      exercises: [removed.workoutExercise],
      createdAt: removed.workoutCreatedAt,
      updatedAt: now,
    }
  }
  if (workout.exercises.some((item) => item.id === removed.workoutExercise.id)) return workout
  return {
    ...workout,
    exercises: insertAfterPreceding(
      workout.exercises,
      removed.workoutExercise,
      removed.precedingIds,
    ),
    updatedAt: now,
  }
}

/**
 * 把 `source`（另一天的訓練）的動作依順序複製到 `target` 的最後面；`target` 為 undefined 時建立 `date` 的訓練。
 * 只複製完整的組（數值與組類型），不複製備註；沒有完整的組的動作跳過。
 * 複製出來的動作與組都有新的 ID。沒有任何可複製的動作時 `target` 不變，`copiedIds` 為空。
 */
export function copyWorkoutExercises(
  source: Workout,
  target: Workout | undefined,
  date: LocalDate,
  { now, createId }: EditContext,
): { workout: Workout | undefined; copiedIds: string[] } {
  const copies: WorkoutExercise[] = source.exercises.flatMap((item) => {
    const sets = item.sets.filter((set) => isCompleteSet(set.values))
    if (sets.length === 0) return []
    return [
      {
        id: createId(),
        exerciseId: item.exerciseId,
        note: '',
        sets: sets.map((set) => ({
          id: createId(),
          setType: set.setType,
          values: { ...set.values },
        })),
      },
    ]
  })
  if (copies.length === 0) return { workout: target, copiedIds: [] }

  const copiedIds = copies.map((item) => item.id)
  if (!target) {
    return {
      workout: { date, exercises: copies, createdAt: now, updatedAt: now },
      copiedIds,
    }
  }
  return {
    workout: { ...target, exercises: [...target.exercises, ...copies], updatedAt: now },
    copiedIds,
  }
}

/**
 * 移除指定的訓練動作（復原複製用）。全部移除後整筆訓練一併刪除（回傳 undefined）；
 * 其中沒有任何一個還在訓練中時，訓練不變。
 */
export function removeWorkoutExercises(
  workout: Workout,
  workoutExerciseIds: readonly string[],
  now: Timestamp,
): Workout | undefined {
  const ids = new Set(workoutExerciseIds)
  const exercises = workout.exercises.filter((item) => !ids.has(item.id))
  if (exercises.length === workout.exercises.length) return workout
  return exercises.length > 0 ? { ...workout, exercises, updatedAt: now } : undefined
}
