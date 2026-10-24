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

/** 該記錄類型所有欄位都還沒填的組數值 */
export function emptySetValues(type: TrackingType): SetValues {
  switch (type) {
    case 'weight_reps':
      return { type, weightKg: null, reps: null }
    case 'reps':
      return { type, reps: null, addedWeightKg: null }
    case 'duration':
      return { type, durationSec: null }
    case 'distance_duration':
      return { type, distanceKm: null, durationSec: null }
  }
}

/** 「新增一組」：複製上一組的數值與熱身標記 */
export function cloneSetForNext(previousSet: WorkoutSet): Omit<WorkoutSet, 'id'> {
  return { isWarmup: previousSet.isWarmup, values: { ...previousSet.values } }
}

/**
 * 把動作加到訓練的最後面，並自動建立空白的第一組。
 * 該日還沒有訓練（`workout` 為 undefined）時，建立該日的訓練。
 */
export function addExerciseToWorkout(
  workout: Workout | undefined,
  date: LocalDate,
  exercise: Pick<ExerciseBase, 'id' | 'trackingType'>,
  { now, createId }: EditContext,
): Workout {
  const added: WorkoutExercise = {
    id: createId(),
    exerciseId: exercise.id,
    note: '',
    sets: [{ id: createId(), isWarmup: false, values: emptySetValues(exercise.trackingType) }],
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
 * 「新增一組」：複製本次最後一組；這個動作目前沒有任何組時，新增一組空白的組。
 */
export function addSetToWorkoutExercise(
  workout: Workout,
  workoutExerciseId: string,
  trackingType: TrackingType,
  { now, createId }: EditContext,
): Workout {
  return updateWorkoutExercise(
    workout,
    workoutExerciseId,
    (item) => {
      const lastSet = item.sets.at(-1)
      const next = lastSet
        ? cloneSetForNext(lastSet)
        : { isWarmup: false, values: emptySetValues(trackingType) }
      return { ...item, sets: [...item.sets, { id: createId(), ...next }] }
    },
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
