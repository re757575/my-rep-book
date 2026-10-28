// 匯入用的 fixture 備份檔：接縫 A 與 E2E 共用，用來建立歷史資料。
// E2E 也會 import 這個檔案，所以只用相對路徑，且只 import 型別。
import type {
  BackupData,
  BodyWeightEntry,
  CustomExercise,
  SetType,
  SetValues,
  Workout,
  WorkoutTemplate,
} from '../domain/types.ts'

/** fixture 中的一組：組數值，可指定組類型（預設正式）、強度（RPE）與完成勾選（`done`，沒有就是不追蹤） */
export type FixtureSet = SetValues & { setType?: SetType; rpe?: number; done?: boolean }

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
      sets: sets.map(({ setType = 'regular', rpe, done, ...values }, s) => ({
        id: `fixture-${date}-${e + 1}-${s + 1}`,
        setType,
        ...(rpe === undefined ? {} : { rpe }),
        ...(done === undefined ? {} : { done }),
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

/**
 * 訓練範本；`exercises` 是 `[動作 ID, 組數]`，ID 依範本 ID 與順序產生。
 *
 * @example
 * fixtureTemplate('push', '推日', [['barbell-bench-press', 4]])
 */
export function fixtureTemplate(
  id: string,
  name: string,
  exercises: [exerciseId: string, setCount: number][],
  createdAt = FIXTURE_TIME,
): WorkoutTemplate {
  return {
    id,
    name,
    exercises: exercises.map(([exerciseId, setCount], index) => ({
      id: `${id}-${index + 1}`,
      exerciseId,
      setCount,
    })),
    createdAt,
    updatedAt: createdAt,
  }
}

/** 某一天的體重（kg） */
export function fixtureBodyWeight(date: string, weightKg: number): BodyWeightEntry {
  return { date, weightKg, updatedAt: FIXTURE_TIME }
}

/** 匯出檔格式的 fixture（PRD §5.7）；未指定的 data 欄位為空，未指定的設定為預設值 */
export function backupFixture(
  {
    settings,
    ...data
  }: Partial<Omit<BackupData, 'settings'>> & { settings?: Partial<BackupData['settings']> } = {},
  {
    schemaVersion = 5,
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
      bodyWeights: [],
      templates: [],
      ...data,
      settings: { weightUnit: 'kg', theme: 'system', heightCm: null, birthDate: null, ...settings },
    } satisfies BackupData,
  }
}
