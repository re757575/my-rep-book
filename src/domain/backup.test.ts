import { describe, expect, it } from 'vitest'
import {
  backupFileName,
  createExportFile,
  migrateBackupData,
  parseBackupFile,
  type BackupMigrations,
} from './backup'
import type { BackupData } from './index'

describe('備份檔名', () => {
  it.each([
    { at: new Date(2026, 9, 24, 12, 0), expected: 'my-rep-book-backup-20261024-1200.json' },
    { at: new Date(2026, 0, 5, 7, 3), expected: 'my-rep-book-backup-20260105-0703.json' },
    { at: new Date(2026, 11, 31, 23, 59), expected: 'my-rep-book-backup-20261231-2359.json' },
  ])('$expected', ({ at, expected }) => {
    expect(backupFileName(at)).toBe(expected)
  })
})

const T = '2026-10-20T10:00:00.000Z'

const sampleData: BackupData = {
  workouts: [
    {
      date: '2026-10-20',
      exercises: [
        {
          id: 'we-1',
          exerciseId: 'barbell-bench-press',
          note: '左肩不適',
          sets: [
            { id: 's-1', isWarmup: true, values: { type: 'weight_reps', weightKg: 40, reps: 10 } },
            { id: 's-2', isWarmup: false, values: { type: 'weight_reps', weightKg: 60, reps: 8 } },
          ],
        },
        {
          id: 'we-2',
          exerciseId: 'custom-1',
          note: '',
          sets: [
            {
              id: 's-3',
              isWarmup: false,
              values: { type: 'distance_duration', distanceKm: 5, durationSec: null },
            },
          ],
        },
      ],
      createdAt: T,
      updatedAt: T,
    },
  ],
  customExercises: [
    {
      id: 'custom-1',
      source: 'custom',
      nameZh: '戶外跑步',
      nameEn: null,
      primaryMuscles: ['full_body'],
      secondaryMuscles: [],
      equipment: 'other',
      trackingType: 'distance_duration',
      archived: false,
      createdAt: T,
      updatedAt: T,
    },
  ],
  hiddenPresetIds: ['hack-squat'],
  settings: { weightUnit: 'lb', theme: 'dark' },
}

/** 把匯出檔物件轉成檔案文字後解析 */
function parse(file: unknown) {
  return parseBackupFile(JSON.stringify(file))
}

describe('匯出檔解析', () => {
  it('匯出檔包含 app 識別、schemaVersion 1、匯出時間與 data', () => {
    expect(createExportFile(sampleData, '2026-10-24T04:00:00.000Z')).toEqual({
      app: 'my-rep-book',
      schemaVersion: 1,
      exportedAt: '2026-10-24T04:00:00.000Z',
      data: sampleData,
    })
  })

  it('解析匯出的檔案得到原本的資料', () => {
    expect(parse(createExportFile(sampleData, T))).toEqual({ ok: true, data: sampleData })
  })

  it('去掉衍生欄位與設定中的上次匯出時間', () => {
    const file = createExportFile(sampleData, T)
    const withExtras = {
      ...file,
      data: {
        ...file.data,
        workouts: file.data.workouts.map((workout) => ({ ...workout, exerciseIds: ['x'] })),
        settings: { ...file.data.settings, lastExportedAt: T },
      },
    }
    expect(parse(withExtras)).toEqual({ ok: true, data: sampleData })
  })
})

/** 以 sampleData 的匯出檔為基礎，改動其中一處 */
function fileWith(
  change: (file: {
    app: unknown
    schemaVersion: unknown
    exportedAt: unknown
    data: BackupData
  }) => void,
) {
  const file = structuredClone(createExportFile(sampleData, T))
  change(file)
  return file
}

describe('格式錯誤時指出錯誤位置', () => {
  it('不是 JSON', () => {
    expect(parseBackupFile('{ 這不是 JSON')).toEqual({ ok: false, error: '檔案不是有效的 JSON' })
  })

  it.each([
    {
      case: '不是物件',
      file: [1, 2, 3],
      error: '這不是 My Rep Book 的備份檔',
    },
    {
      case: 'app 識別不符',
      file: fileWith((file) => (file.app = 'other-app')),
      error: '這不是 My Rep Book 的備份檔',
    },
    {
      case: '匯出時間不合法',
      file: fileWith((file) => (file.exportedAt = '昨天')),
      error: 'exportedAt 格式錯誤',
    },
    {
      case: 'schemaVersion 不是正整數',
      file: fileWith((file) => (file.schemaVersion = 0.5)),
      error: 'schemaVersion 格式錯誤',
    },
    {
      case: '缺少 data',
      file: fileWith((file) => delete (file as Partial<typeof file>).data),
      error: '缺少 data',
    },
    {
      case: '缺少 customExercises',
      file: fileWith((file) => delete (file.data as Partial<BackupData>).customExercises),
      error: '缺少 customExercises',
    },
    {
      case: '日期不存在',
      file: fileWith((file) => (file.data.workouts[0].date = '2026-02-30')),
      error: 'workouts[0].date 格式錯誤',
    },
    {
      case: '組的記錄類型不合法',
      file: fileWith((file) => {
        ;(file.data.workouts[0].exercises[1].sets[0].values as { type: string }).type = 'speed'
      }),
      error: 'workouts[0].exercises[1].sets[0].values.type 格式錯誤',
    },
    {
      case: '次數不是 1–9999 的整數',
      file: fileWith((file) => {
        file.data.workouts[0].exercises[0].sets[1].values = {
          type: 'weight_reps',
          weightKg: 60,
          reps: 0,
        }
      }),
      error: 'workouts[0].exercises[0].sets[1].values.reps 格式錯誤',
    },
    {
      case: '重量是負數',
      file: fileWith((file) => {
        file.data.workouts[0].exercises[0].sets[0].values = {
          type: 'weight_reps',
          weightKg: -1,
          reps: 10,
        }
      }),
      error: 'workouts[0].exercises[0].sets[0].values.weightKg 格式錯誤',
    },
    {
      case: '同一天有兩筆訓練',
      file: fileWith((file) => file.data.workouts.push({ ...file.data.workouts[0] })),
      error: 'workouts[1].date 重複',
    },
    {
      case: '自訂動作沒有主要部位',
      file: fileWith((file) => (file.data.customExercises[0].primaryMuscles = [])),
      error: 'customExercises[0].primaryMuscles 格式錯誤',
    },
    {
      case: '設定的重量單位不合法',
      file: fileWith((file) => {
        ;(file.data.settings as { weightUnit: string }).weightUnit = 'stone'
      }),
      error: 'settings.weightUnit 格式錯誤',
    },
  ])('$case → 「$error」', ({ file, error }) => {
    expect(parse(file)).toEqual({ ok: false, error })
  })
})

describe('schema 版本與遷移', () => {
  it('版本比目前 App 新時拒絕', () => {
    expect(parse(fileWith((file) => (file.schemaVersion = 2)))).toEqual({
      ok: false,
      error: '此備份來自較新版本的 App，請先更新 App',
    })
  })

  /** 每一步都記下自己的版本號，用來確認執行了哪些遷移、順序為何 */
  const recordingMigrations: BackupMigrations = {
    1: (data) => ({ ...data, steps: [...(data.steps as number[]), 1] }),
    2: (data) => ({ ...data, steps: [...(data.steps as number[]), 2] }),
    3: (data) => ({ ...data, steps: [...(data.steps as number[]), 3] }),
  }

  it.each([
    { from: 1, to: 4, steps: [1, 2, 3] },
    { from: 2, to: 4, steps: [2, 3] },
    { from: 1, to: 2, steps: [1] },
    { from: 3, to: 3, steps: [] },
  ])('v$from → v$to 依序執行 $steps', ({ from, to, steps }) => {
    expect(
      migrateBackupData({ steps: [] }, from, { migrations: recordingMigrations, toVersion: to }),
    ).toEqual({ steps })
  })

  it('缺少某一版的遷移時丟出錯誤', () => {
    expect(() =>
      migrateBackupData({}, 1, { migrations: { 1: (data) => data }, toVersion: 3 }),
    ).toThrow('缺少 v2 → v3 的遷移')
  })

  it('舊版的檔案先遷移再驗證', () => {
    // 假設 v1 的設定以 unit 記錄重量單位，v2 改名為 weightUnit
    const v1 = fileWith((file) => {
      const { weightUnit, ...rest } = file.data.settings
      ;(file.data as { settings: unknown }).settings = { ...rest, unit: weightUnit }
    })
    const migrations: BackupMigrations = {
      1: (data) => {
        const { unit, ...settings } = data.settings as Record<string, unknown>
        return { ...data, settings: { ...settings, weightUnit: unit } }
      },
    }

    expect(parse(v1)).toEqual({ ok: false, error: '缺少 settings.weightUnit' })
    expect(parseBackupFile(JSON.stringify(v1), { migrations, currentVersion: 2 })).toEqual({
      ok: true,
      data: sampleData,
    })
  })
})

describe('引用的動作', () => {
  /** 在 2026-10-20 的訓練最後加入一個引用 exerciseId 的訓練動作 */
  function referencing(file: { data: BackupData }, exerciseId: string) {
    file.data.workouts[0].exercises.push({
      id: `we-${exerciseId}`,
      exerciseId,
      note: '',
      sets: [],
    })
  }

  it('引用了不存在的動作時拒絕，依出現順序列出缺少的 ID（不重複）', () => {
    const file = fileWith((file) => {
      referencing(file, 'no-such-preset')
      referencing(file, 'custom-deleted')
      referencing(file, 'no-such-preset')
    })
    expect(parse(file)).toEqual({
      ok: false,
      error: '找不到以下動作：no-such-preset、custom-deleted',
    })
  })

  it('隱藏了不存在的預設動作時拒絕', () => {
    const file = fileWith((file) => file.data.hiddenPresetIds.push('custom-1', 'no-such-preset'))
    expect(parse(file)).toEqual({
      ok: false,
      error: '找不到以下動作：custom-1、no-such-preset',
    })
  })

  it('組的記錄類型與動作不一致時拒絕', () => {
    const file = fileWith((file) => {
      file.data.workouts[0].exercises[1].sets[0].values = {
        type: 'weight_reps',
        weightKg: 60,
        reps: 8,
      }
    })
    expect(parse(file)).toEqual({
      ok: false,
      error: 'workouts[0].exercises[1].sets[0].values.type 與動作的記錄類型不符',
    })
  })
})
