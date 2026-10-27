import { z } from 'zod'
import { isValidBirthDate } from './age'
import { isValidBodyWeightKg, isValidHeightCm } from './bodyMetrics'
import { isValidLocalDate } from './dates'
import { MAX_RPE, MIN_RPE } from './effort'
import { PRESET_EXERCISES } from './presets'
import { migrateWorkoutSetTypes } from './setTypes'
import { validateSetValues } from './setValues'
import {
  EQUIPMENTS,
  MUSCLES,
  SET_TYPES,
  THEMES,
  TRACKING_TYPES,
  WEIGHT_UNITS,
  type BackupData,
  type SetValues,
  type Timestamp,
  type TrackingType,
} from './types'

/** 匯出檔的 app 識別字串 */
export const BACKUP_APP_ID = 'my-rep-book'

/** 目前 App 的匯出檔 schema 版本 */
export const CURRENT_SCHEMA_VERSION = 4

/** 匯出檔（PRD §5.7） */
export interface ExportFile {
  app: typeof BACKUP_APP_ID
  schemaVersion: typeof CURRENT_SCHEMA_VERSION
  exportedAt: Timestamp
  data: BackupData
}

export type ParseBackupResult = { ok: true; data: BackupData } | { ok: false; error: string }

const pad = (value: number) => String(value).padStart(2, '0')

/** 匯出檔名：`my-rep-book-backup-YYYYMMDD-HHmm.json`，以本地時區的匯出時間命名 */
export function backupFileName(at: Date): string {
  const date = `${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}`
  const time = `${pad(at.getHours())}${pad(at.getMinutes())}`
  return `my-rep-book-backup-${date}-${time}.json`
}

export function createExportFile(data: BackupData, exportedAt: Timestamp): ExportFile {
  return { app: BACKUP_APP_ID, schemaVersion: CURRENT_SCHEMA_VERSION, exportedAt, data }
}

/** 自己加的檢查錯誤：訊息直接接在位置後面（例如「workouts[1].date 重複」） */
function addDetailIssue(ctx: z.RefinementCtx, path: PropertyKey[], message: string) {
  ctx.addIssue({ code: 'custom', path, message, params: { detail: true } })
}

const timestamp = z.iso.datetime()
const nullableNumber = z.number().nullable()

const setValuesSchema = z
  .discriminatedUnion('type', [
    z.object({ type: z.literal('weight_reps'), weightKg: nullableNumber, reps: nullableNumber }),
    z.object({ type: z.literal('reps'), reps: nullableNumber, addedWeightKg: nullableNumber }),
    z.object({ type: z.literal('duration'), durationSec: nullableNumber }),
    z.object({
      type: z.literal('distance_duration'),
      distanceKm: nullableNumber,
      durationSec: nullableNumber,
    }),
  ])
  .superRefine((values, ctx) => {
    // 和輸入時相同的規則；尚未填寫（null）的欄位不算錯誤
    for (const field of Object.keys(validateSetValues(values as SetValues))) {
      ctx.addIssue({ code: 'custom', path: [field], message: 'invalid' })
    }
  })

const workoutSchema = z.object({
  date: z.string().refine(isValidLocalDate),
  exercises: z
    .array(
      z.object({
        id: z.string().min(1),
        exerciseId: z.string().min(1),
        note: z.string(),
        sets: z.array(
          z.object({
            id: z.string().min(1),
            setType: z.enum(SET_TYPES),
            // 強度（US-39）：選填的整數 1–10；舊備份沒有這個欄位
            rpe: z.number().int().min(MIN_RPE).max(MAX_RPE).optional(),
            values: setValuesSchema,
          }),
        ),
      }),
    )
    .min(1),
  createdAt: timestamp,
  updatedAt: timestamp,
})

const customExerciseSchema = z.object({
  id: z.string().startsWith('custom-'),
  source: z.literal('custom'),
  nameZh: z.string().trim().min(1),
  nameEn: z.string().nullable(),
  primaryMuscles: z.array(z.enum(MUSCLES)).min(1),
  secondaryMuscles: z.array(z.enum(MUSCLES)),
  equipment: z.enum(EQUIPMENTS),
  trackingType: z.enum(TRACKING_TYPES),
  archived: z.boolean(),
  createdAt: timestamp,
  updatedAt: timestamp,
})

const bodyWeightSchema = z.object({
  date: z.string().refine(isValidLocalDate),
  weightKg: z.number().refine(isValidBodyWeightKg),
  updatedAt: timestamp,
})

/** 陣列中第二次以後出現的同一個鍵（例如同一天的訓練），標為重複 */
function rejectDuplicates<T>(key: (item: T) => string, field: string) {
  return (items: T[], ctx: z.RefinementCtx) => {
    const seen = new Set<string>()
    items.forEach((item, index) => {
      if (seen.has(key(item))) addDetailIssue(ctx, [index, field], '重複')
      seen.add(key(item))
    })
  }
}

/** 目前版本的 data；未知的欄位（例如衍生欄位）會被去掉 */
const backupDataSchema = z.object({
  workouts: z.array(workoutSchema).superRefine(rejectDuplicates((workout) => workout.date, 'date')),
  customExercises: z
    .array(customExerciseSchema)
    .superRefine(rejectDuplicates((exercise) => exercise.id, 'id')),
  hiddenPresetIds: z.array(z.string()),
  bodyWeights: z
    .array(bodyWeightSchema)
    .superRefine(rejectDuplicates((entry) => entry.date, 'date')),
  settings: z.object({
    weightUnit: z.enum(WEIGHT_UNITS),
    theme: z.enum(THEMES),
    heightCm: z.number().refine(isValidHeightCm).nullable(),
    birthDate: z.string().refine(isValidBirthDate).nullable(),
  }),
})

/** 檔案外層：版本與 data 的結構留給後續步驟檢查 */
const envelopeSchema = z.object({
  schemaVersion: z.number().int().positive(),
  exportedAt: timestamp,
  data: z.looseObject({}),
})

/** zod 的錯誤位置，例如 `['workouts', 3, 'date']` → `workouts[3].date` */
function formatPath(path: readonly PropertyKey[]): string {
  return path
    .map((key, index) =>
      typeof key === 'number' ? `[${key}]` : `${index === 0 ? '' : '.'}${String(key)}`,
    )
    .join('')
}

/** 把第一個驗證錯誤轉成給使用者看的訊息 */
function describeIssue(issue: z.core.$ZodIssue): string {
  const path = formatPath(issue.path)
  if (issue.code === 'custom') {
    return issue.params?.detail ? `${path} ${issue.message}` : `${path} 格式錯誤`
  }
  if (issue.input === undefined) return `缺少 ${path}`
  return `${path} 格式錯誤`
}

function validate<T>(schema: z.ZodType<T>, value: unknown) {
  const result = schema.safeParse(value, { reportInput: true })
  return result.success
    ? ({ ok: true, value: result.data } as const)
    : ({ ok: false, error: describeIssue(result.error.issues[0]) } as const)
}

function parseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) }
  } catch {
    return { ok: false }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 備份 data 在遷移過程中的形狀：各版本不同，遷移函式自行檢查 */
type UnknownData = Record<string, unknown>

/** `migrations[n]`：把 v(n) 的 data 升級成 v(n+1) */
export type BackupMigrations = Readonly<Record<number, (data: UnknownData) => UnknownData>>

/** 各版本之間的遷移；schema 升版時在這裡加上 `[舊版]: (data) => 新版 data` */
export const BACKUP_MIGRATIONS: BackupMigrations = {
  // v2 新增體重紀錄與設定中的身高；格式不對的 settings 原樣保留，留給驗證指出錯誤
  1: (data) => ({
    ...data,
    bodyWeights: [],
    settings: isRecord(data.settings) ? { ...data.settings, heightCm: null } : data.settings,
  }),
  // v3 新增設定中的生日
  2: (data) => ({
    ...data,
    settings: isRecord(data.settings) ? { ...data.settings, birthDate: null } : data.settings,
  }),
  // v4 把組的 isWarmup 換成 setType（true → warmup，false → regular）；格式不對的資料原樣保留，留給驗證指出錯誤
  3: (data) => ({
    ...data,
    workouts: Array.isArray(data.workouts)
      ? data.workouts.map(migrateWorkoutSetTypes)
      : data.workouts,
  }),
}

interface MigrationOptions {
  migrations?: BackupMigrations
  toVersion?: number
}

/** 把 v`fromVersion` 的 data 逐版遷移到 v`toVersion`：v1 → v2 → … → 目前版本 */
export function migrateBackupData(
  data: UnknownData,
  fromVersion: number,
  { migrations = BACKUP_MIGRATIONS, toVersion = CURRENT_SCHEMA_VERSION }: MigrationOptions = {},
): UnknownData {
  let current = data
  for (let version = fromVersion; version < toVersion; version++) {
    const migrate = migrations[version]
    if (!migrate) throw new Error(`缺少 v${version} → v${version + 1} 的遷移`)
    current = migrate(current)
  }
  return current
}

const NEWER_VERSION_ERROR = '此備份來自較新版本的 App，請先更新 App'

/**
 * 解析匯入的檔案內容（PRD §5.7）：驗證格式並遷移到目前版本。
 * 不合法時回傳給使用者看的錯誤訊息，指出錯誤的位置。
 * `options` 只在測試遷移框架時替換。
 */
export function parseBackupFile(
  text: string,
  {
    migrations = BACKUP_MIGRATIONS,
    currentVersion = CURRENT_SCHEMA_VERSION,
  }: { migrations?: BackupMigrations; currentVersion?: number } = {},
): ParseBackupResult {
  const json = parseJson(text)
  if (!json.ok) return { ok: false, error: '檔案不是有效的 JSON' }
  if (!isRecord(json.value) || json.value.app !== BACKUP_APP_ID) {
    return { ok: false, error: '這不是 My Rep Book 的備份檔' }
  }

  const envelope = validate(envelopeSchema, json.value)
  if (!envelope.ok) return envelope
  const { schemaVersion } = envelope.value
  if (schemaVersion > currentVersion) return { ok: false, error: NEWER_VERSION_ERROR }

  const migrated = migrateBackupData(envelope.value.data, schemaVersion, {
    migrations,
    toVersion: currentVersion,
  })
  const data = validate(backupDataSchema, migrated)
  if (!data.ok) return data
  const referenceError = checkReferences(data.value)
  if (referenceError) return { ok: false, error: referenceError }
  return { ok: true, data: data.value }
}

/**
 * 檢查引用的動作：訓練與隱藏清單引用的動作都要存在（預設動作或檔案中的自訂動作），
 * 組的記錄類型也要和動作一致。回傳錯誤訊息，沒有問題時回傳 undefined。
 */
function checkReferences(data: BackupData): string | undefined {
  const presetIds = new Set(PRESET_EXERCISES.map((exercise) => exercise.id))
  const trackingTypes = new Map<string, TrackingType>(
    [...PRESET_EXERCISES, ...data.customExercises].map((exercise) => [
      exercise.id,
      exercise.trackingType,
    ]),
  )

  const missing = new Set<string>()
  for (const workout of data.workouts) {
    for (const { exerciseId } of workout.exercises) {
      if (!trackingTypes.has(exerciseId)) missing.add(exerciseId)
    }
  }
  for (const id of data.hiddenPresetIds) {
    if (!presetIds.has(id)) missing.add(id)
  }
  if (missing.size > 0) return `找不到以下動作：${[...missing].join('、')}`

  for (const [w, workout] of data.workouts.entries()) {
    for (const [e, exercise] of workout.exercises.entries()) {
      const expected = trackingTypes.get(exercise.exerciseId)
      const s = exercise.sets.findIndex((set) => set.values.type !== expected)
      if (s >= 0) {
        const path = formatPath(['workouts', w, 'exercises', e, 'sets', s, 'values', 'type'])
        return `${path} 與動作的記錄類型不符`
      }
    }
  }
  return undefined
}
