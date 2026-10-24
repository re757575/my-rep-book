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
