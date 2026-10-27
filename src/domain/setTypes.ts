import { SET_TYPES, type SetType, type WorkoutSet } from './types'

/** 組類型的名稱 */
export const SET_TYPE_LABELS: Readonly<Record<SetType, string>> = {
  regular: '正式',
  warmup: '熱身',
  drop: '遞減',
  failure: '力竭',
}

/** 類型按鈕上的單字 */
export const SET_TYPE_SHORT_LABELS: Readonly<Record<SetType, string>> = {
  regular: '正',
  warmup: '熱',
  drop: '遞',
  failure: '竭',
}

/** 類型按鈕按一下的下一個：正式 → 熱身 → 遞減 → 力竭 → 正式，所以標熱身只要按一下 */
export function nextSetType(type: SetType): SetType {
  return SET_TYPES[(SET_TYPES.indexOf(type) + 1) % SET_TYPES.length]
}

/** 熱身組：不計入摘要、統計、上次紀錄與個人紀錄 */
export function isWarmupSet(set: Pick<WorkoutSet, 'setType'>): boolean {
  return set.setType === 'warmup'
}

/** 正式組：不是熱身的組，也就是正式、遞減與力竭 */
export function isWorkingSet(set: Pick<WorkoutSet, 'setType'>): boolean {
  return set.setType !== 'warmup'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function migrateSetType(set: unknown): unknown {
  if (!isRecord(set) || !('isWarmup' in set)) return set
  const { isWarmup, ...rest } = set
  return { ...rest, setType: isWarmup === true ? 'warmup' : 'regular' }
}

/**
 * 舊版（備份檔 schema v3、IndexedDB v2）的組是 `isWarmup: boolean`，新版是 `setType`：
 * `true` 換成 `warmup`，`false` 換成 `regular`。備份檔遷移與 IndexedDB 升級共用。
 * 格式不對的資料原樣保留，留給驗證指出錯誤；已經是新格式的組不動。
 */
export function migrateWorkoutSetTypes(workout: unknown): unknown {
  if (!isRecord(workout) || !Array.isArray(workout.exercises)) return workout
  return {
    ...workout,
    exercises: workout.exercises.map((item: unknown) =>
      isRecord(item) && Array.isArray(item.sets)
        ? { ...item, sets: item.sets.map(migrateSetType) }
        : item,
    ),
  }
}
