import { isCompleteSet } from './setValues'
import type { LocalDate, Workout } from './types'

/** 一組的重量與次數 */
export interface WeightRepsSet {
  weightKg: number
  reps: number
}

/** 某一次訓練中，這個動作的進度 */
export interface ExerciseSessionProgress {
  date: LocalDate
  /** 當天最重的一組；同重量取次數多的 */
  topSet: WeightRepsSet
  /** 當天各組估算 1RM 的最大值（kg） */
  estimatedOneRepMaxKg: number
  /** 當天這個動作的訓練量（kg） */
  volumeKg: number
  /** 最重的一組比之前每一次都重；第一次訓練不算 */
  isMaxWeightRecord: boolean
  /** 估算 1RM 比之前每一次都高；第一次訓練不算 */
  isOneRepMaxRecord: boolean
}

/** 個人紀錄中的一項：第一次達到這個紀錄的日期與那一組 */
export interface PersonalRecord {
  date: LocalDate
  set: WeightRepsSet
}

export interface ExerciseRecords {
  /** 最大重量；同重量取次數多的 */
  maxWeight: PersonalRecord
  /** 估算 1RM 最高的一組 */
  oneRepMax: PersonalRecord & { estimatedKg: number }
  /** 每一次訓練的進度，由新到舊 */
  sessions: ExerciseSessionProgress[]
}

/**
 * 估算 1RM（Epley 公式）：重量 ×（1 + 次數 ÷ 30）。
 * 做 1 下時就是該重量本身，不套公式。
 */
export function estimateOneRepMaxKg({ weightKg, reps }: WeightRepsSet): number {
  return reps === 1 ? weightKg : weightKg * (1 + reps / 30)
}

/** a 是否比 b 重；同重量時次數多的較好 */
function isHeavier(a: WeightRepsSet, b: WeightRepsSet) {
  return a.weightKg > b.weightKg || (a.weightKg === b.weightKg && a.reps > b.reps)
}

/** 最重的一組；同重量取次數多的。`sets` 至少要有一組 */
export function heaviestSet<T extends WeightRepsSet>(sets: readonly T[]): T {
  return sets.reduce((best, set) => (isHeavier(set, best) ? set : best))
}

/** 這一天這個動作的完整正式組（重量×次數），依組的順序；同一天加入多次這個動作時合併 */
function workingSetsWithIds(
  workout: Workout,
  exerciseId: string,
): (WeightRepsSet & { id: string })[] {
  const sets: (WeightRepsSet & { id: string })[] = []
  for (const item of workout.exercises) {
    if (item.exerciseId !== exerciseId) continue
    for (const { id, setType, values } of item.sets) {
      if (setType === 'warmup' || values.type !== 'weight_reps' || !isCompleteSet(values)) continue
      sets.push({ id, weightKg: values.weightKg ?? 0, reps: values.reps ?? 0 })
    }
  }
  return sets
}

function workingSetsOf(workout: Workout, exerciseId: string): WeightRepsSet[] {
  return workingSetsWithIds(workout, exerciseId).map(({ weightKg, reps }) => ({ weightKg, reps }))
}

/**
 * 從包含這個動作的訓練算出個人紀錄與每一次的進度。只算重量×次數的完整正式組，
 * 熱身組與不完整的組不計入；沒有任何一組可算時（例如還沒有紀錄）回傳 undefined。
 */
export function buildExerciseRecords(
  workouts: readonly Workout[],
  exerciseId: string,
): ExerciseRecords | undefined {
  const oldestFirst = [...workouts].sort((a, b) => a.date.localeCompare(b.date))
  const sessions: ExerciseSessionProgress[] = []
  let maxWeight: PersonalRecord | undefined
  let oneRepMax: (PersonalRecord & { estimatedKg: number }) | undefined

  for (const workout of oldestFirst) {
    const sets = workingSetsOf(workout, exerciseId)
    if (sets.length === 0) continue

    const topSet = heaviestSet(sets)
    const bestOneRepMaxSet = sets.reduce((best, set) =>
      estimateOneRepMaxKg(set) > estimateOneRepMaxKg(best) ? set : best,
    )
    const estimatedOneRepMaxKg = estimateOneRepMaxKg(bestOneRepMaxSet)
    const isMaxWeightRecord = maxWeight !== undefined && isHeavier(topSet, maxWeight.set)
    const isOneRepMaxRecord =
      oneRepMax !== undefined && estimatedOneRepMaxKg > oneRepMax.estimatedKg

    if (!maxWeight || isMaxWeightRecord) maxWeight = { date: workout.date, set: topSet }
    if (!oneRepMax || isOneRepMaxRecord) {
      oneRepMax = { date: workout.date, set: bestOneRepMaxSet, estimatedKg: estimatedOneRepMaxKg }
    }
    sessions.push({
      date: workout.date,
      topSet,
      estimatedOneRepMaxKg,
      volumeKg: sets.reduce((total, set) => total + set.weightKg * set.reps, 0),
      isMaxWeightRecord,
      isOneRepMaxRecord,
    })
  }

  if (!maxWeight || !oneRepMax) return undefined
  return { maxWeight, oneRepMax, sessions: sessions.reverse() }
}

/** 檢視日期之前，這個動作的最大重量（同重量取次數多的）與最高的估算 1RM */
export interface RecordBaseline {
  maxWeight: WeightRepsSet
  oneRepMaxKg: number
}

/** 訓練頁上一組破了哪一種紀錄 */
export type SetRecordKind = 'maxWeight' | 'oneRepMax'

/** 從 `before` 之前（不含當天）的訓練算出基準；之前沒有可計算的組時回傳 undefined */
export function buildRecordBaseline(
  workouts: readonly Workout[],
  exerciseId: string,
  before: LocalDate,
): RecordBaseline | undefined {
  const sets = workouts
    .filter((workout) => workout.date < before)
    .flatMap((workout) => workingSetsOf(workout, exerciseId))
  if (sets.length === 0) return undefined
  return {
    maxWeight: heaviestSet(sets),
    oneRepMaxKg: Math.max(...sets.map(estimateOneRepMaxKg)),
  }
}

/**
 * 這一天這個動作每一組的新紀錄標示，key 是組的 ID；沒有標示的組不出現。
 * 一組要比 `baseline`（之前的訓練）以及當天排在它前面的組都更好才標示，所以追平不算；
 * `baseline` 為 undefined（第一次訓練）時都不標示。結果與 `buildExerciseRecords` 的
 * 當次標示一致：某天有任何一組標示，那天的 `isMaxWeightRecord`／`isOneRepMaxRecord` 就為 true。
 */
export function findNewRecordSets(
  baseline: RecordBaseline | undefined,
  workout: Workout,
  exerciseId: string,
): Map<string, SetRecordKind[]> {
  const records = new Map<string, SetRecordKind[]>()
  if (!baseline) return records
  let { maxWeight, oneRepMaxKg } = baseline
  for (const set of workingSetsWithIds(workout, exerciseId)) {
    const kinds: SetRecordKind[] = []
    if (isHeavier(set, maxWeight)) {
      kinds.push('maxWeight')
      maxWeight = set
    }
    const estimated = estimateOneRepMaxKg(set)
    if (estimated > oneRepMaxKg) {
      kinds.push('oneRepMax')
      oneRepMaxKg = estimated
    }
    if (kinds.length > 0) records.set(set.id, kinds)
  }
  return records
}
