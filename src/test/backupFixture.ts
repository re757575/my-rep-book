// 匯入用的 fixture 備份檔：接縫 A 與 E2E 共用，用來建立歷史資料。
// E2E 也會 import 這個檔案，所以只用相對路徑，且只 import 型別。
import type { BackupData, CustomExercise, SetValues, Workout } from '../domain/types.ts'

/** fixture 中的一組：組數值，可加上熱身標記 */
export type FixtureSet = SetValues & { isWarmup?: boolean }

export interface FixtureExercise {
  exerciseId: string
  note?: string
  sets: FixtureSet[]
}

/** 建立時間、更新時間的預設值：固定的「今天」之前 */
const FIXTURE_TIME = '2026-10-01T00:00:00.000Z'

/**
 * 某一天的訓練。ID 依日期與順序產生，同一個 fixture 內不重複。
 *
 * @example
 * fixtureWorkout('2026-10-20', [
 *   { exerciseId: 'barbell-bench-press', sets: [{ type: 'weight_reps', weightKg: 60, reps: 8 }] },
 * ])
 */
export function fixtureWorkout(date: string, exercises: FixtureExercise[]): Workout {
  return {
    date,
    exercises: exercises.map(({ exerciseId, note = '', sets }, e) => ({
      id: `fixture-${date}-${e + 1}`,
      exerciseId,
      note,
      sets: sets.map(({ isWarmup = false, ...values }, s) => ({
        id: `fixture-${date}-${e + 1}-${s + 1}`,
        isWarmup,
        values: values as SetValues,
      })),
    })),
    createdAt: FIXTURE_TIME,
    updatedAt: FIXTURE_TIME,
  }
}

/** 自訂動作；未指定的欄位用預設值。`id` 必須以 `custom-` 開頭 */
export function fixtureCustomExercise(
  exercise: Pick<CustomExercise, 'id' | 'nameZh' | 'trackingType'> & Partial<CustomExercise>,
): CustomExercise {
  return {
    source: 'custom',
    nameEn: null,
    primaryMuscles: ['full_body'],
    secondaryMuscles: [],
    equipment: 'other',
    archived: false,
    createdAt: FIXTURE_TIME,
    updatedAt: FIXTURE_TIME,
    ...exercise,
  }
}

/** 匯出檔格式的 fixture（PRD §5.7）；未指定的 data 欄位為空，設定為預設值 */
export function backupFixture(
  data: Partial<BackupData> = {},
  {
    schemaVersion = 1,
    exportedAt = FIXTURE_TIME,
  }: { schemaVersion?: number; exportedAt?: string } = {},
) {
  return {
    app: 'my-rep-book',
    schemaVersion,
    exportedAt,
    data: {
      workouts: [],
      customExercises: [],
      hiddenPresetIds: [],
      settings: { weightUnit: 'kg', theme: 'system' },
      ...data,
    } satisfies BackupData,
  }
}
