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
            {
              id: 's-1',
              setType: 'warmup',
              values: { type: 'weight_reps', weightKg: 40, reps: 10 },
            },
            {
              id: 's-2',
              setType: 'regular',
              values: { type: 'weight_reps', weightKg: 60, reps: 8 },
            },
          ],
        },
        {
          id: 'we-2',
          exerciseId: 'custom-1',
          note: '',
          sets: [
            {
              id: 's-3',
              setType: 'regular',
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
  bodyWeights: [
    { date: '2026-10-19', weightKg: 72.5, updatedAt: T },
    { date: '2026-10-20', weightKg: 72.25, updatedAt: T },
  ],
  templates: [
    {
      id: 'tpl-1',
      name: '推日',
      exercises: [
        { id: 'te-1', exerciseId: 'barbell-bench-press', setCount: 4 },
        { id: 'te-2', exerciseId: 'custom-1', setCount: 1 },
      ],
      createdAt: T,
      updatedAt: T,
    },
  ],
  settings: { weightUnit: 'lb', theme: 'dark', heightCm: 175, birthDate: '1990-05-20' },
}

/** 把匯出檔物件轉成檔案文字後解析 */
function parse(file: unknown) {
  return parseBackupFile(JSON.stringify(file))
}

describe('匯出檔解析', () => {
  it('匯出檔包含 app 識別、schemaVersion 5、匯出時間與 data', () => {
    expect(createExportFile(sampleData, '2026-10-24T04:00:00.000Z')).toEqual({
      app: 'my-rep-book',
      schemaVersion: 5,
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
    {
      case: '缺少 bodyWeights',
      file: fileWith((file) => delete (file.data as Partial<BackupData>).bodyWeights),
      error: '缺少 bodyWeights',
    },
    {
      case: '體重不大於 0',
      file: fileWith((file) => (file.data.bodyWeights[1].weightKg = 0)),
      error: 'bodyWeights[1].weightKg 格式錯誤',
    },
    {
      case: '同一天有兩筆體重',
      file: fileWith((file) => file.data.bodyWeights.push({ ...file.data.bodyWeights[0] })),
      error: 'bodyWeights[2].date 重複',
    },
    {
      case: '缺少 templates',
      file: fileWith((file) => delete (file.data as Partial<BackupData>).templates),
      error: '缺少 templates',
    },
    {
      case: '範本名稱去掉空白後是空的',
      file: fileWith((file) => (file.data.templates[0].name = '   ')),
      error: 'templates[0].name 格式錯誤',
    },
    {
      case: '範本名稱超過 30 個字',
      file: fileWith((file) => (file.data.templates[0].name = '推'.repeat(31))),
      error: 'templates[0].name 格式錯誤',
    },
    {
      case: '範本沒有任何動作',
      file: fileWith((file) => (file.data.templates[0].exercises = [])),
      error: 'templates[0].exercises 格式錯誤',
    },
    {
      case: '範本的組數不是 1–20 的整數',
      file: fileWith((file) => (file.data.templates[0].exercises[1].setCount = 21)),
      error: 'templates[0].exercises[1].setCount 格式錯誤',
    },
    {
      case: '範本的組數不是整數',
      file: fileWith((file) => (file.data.templates[0].exercises[0].setCount = 2.5)),
      error: 'templates[0].exercises[0].setCount 格式錯誤',
    },
    {
      case: '兩個範本的 ID 相同',
      file: fileWith((file) => file.data.templates.push({ ...file.data.templates[0] })),
      error: 'templates[1].id 重複',
    },
    {
      case: '生日不是合法的日期',
      file: fileWith((file) => (file.data.settings.birthDate = '1990-02-30')),
      error: 'settings.birthDate 格式錯誤',
    },
    {
      case: '身高超出範圍',
      file: fileWith((file) => (file.data.settings.heightCm = 1750)),
      error: 'settings.heightCm 格式錯誤',
    },
  ])('$case → 「$error」', ({ file, error }) => {
    expect(parse(file)).toEqual({ ok: false, error })
  })
})

describe('schema 版本與遷移', () => {
  it('版本比目前 App 新時拒絕', () => {
    expect(parse(fileWith((file) => (file.schemaVersion = 6)))).toEqual({
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

  it('v1 的檔案（還沒有體重、身高與生日）依序遷移到目前版本', () => {
    const v1 = fileWith((file) => {
      file.schemaVersion = 1
      delete (file.data as Partial<BackupData>).bodyWeights
      delete (file.data as Partial<BackupData>).templates
      delete (file.data.settings as { heightCm?: unknown }).heightCm
      delete (file.data.settings as { birthDate?: unknown }).birthDate
    })
    expect(parse(v1)).toEqual({
      ok: true,
      data: {
        ...sampleData,
        bodyWeights: [],
        templates: [],
        settings: { ...sampleData.settings, heightCm: null, birthDate: null },
      },
    })
  })

  it('v2 的檔案（還沒有生日）遷移成尚未填寫生日', () => {
    const v2 = fileWith((file) => {
      file.schemaVersion = 2
      delete (file.data as Partial<BackupData>).templates
      delete (file.data.settings as { birthDate?: unknown }).birthDate
    })
    expect(parse(v2)).toEqual({
      ok: true,
      data: {
        ...sampleData,
        templates: [],
        settings: { ...sampleData.settings, birthDate: null },
      },
    })
  })

  /** 舊版的組是 `isWarmup: boolean`：把 sampleData 的第一個動作換回舊格式 */
  function withLegacyWarmupFlags(file: { schemaVersion: unknown; data: BackupData }) {
    for (const exercise of file.data.workouts[0].exercises) {
      exercise.sets = exercise.sets.map(({ setType, ...rest }) => ({
        ...rest,
        isWarmup: setType === 'warmup',
      })) as never
    }
  }

  it('v3 的檔案（組是 isWarmup）遷移成 setType：true 變熱身，false 變正式', () => {
    const v3 = fileWith((file) => {
      file.schemaVersion = 3
      delete (file.data as Partial<BackupData>).templates
      withLegacyWarmupFlags(file)
    })
    expect(parse(v3)).toEqual({ ok: true, data: { ...sampleData, templates: [] } })
  })

  it('v1 的檔案也一路遷移到 setType', () => {
    const v1 = fileWith((file) => {
      file.schemaVersion = 1
      delete (file.data as Partial<BackupData>).bodyWeights
      delete (file.data as Partial<BackupData>).templates
      delete (file.data.settings as { heightCm?: unknown }).heightCm
      delete (file.data.settings as { birthDate?: unknown }).birthDate
      withLegacyWarmupFlags(file)
    })
    expect(parse(v1)).toMatchObject({ ok: true })
    const result = parse(v1)
    expect(
      result.ok && result.data.workouts[0].exercises[0].sets.map((set) => set.setType),
    ).toEqual(['warmup', 'regular'])
  })

  it('組類型不是四種之一時指出錯誤位置', () => {
    const file = fileWith((file) => {
      ;(file.data.workouts[0].exercises[0].sets[0] as { setType: string }).setType = 'superset'
    })
    expect(parse(file)).toEqual({
      ok: false,
      error: 'workouts[0].exercises[0].sets[0].setType 格式錯誤',
    })
  })

  it('每一組的強度（rpe）是選填的 1–10 整數：沒有這個欄位的舊備份照常匯入，不需要遷移', () => {
    const withRpe = fileWith((file) => {
      ;(file.data.workouts[0].exercises[0].sets[1] as { rpe?: number }).rpe = 8
    })
    const result = parse(withRpe)
    expect(result.ok && result.data.workouts[0].exercises[0].sets.map((set) => set.rpe)).toEqual([
      undefined,
      8,
    ])
    // sampleData 的組都沒有 rpe：照樣是合法的目前版本
    expect(parse(fileWith(() => {}))).toEqual({ ok: true, data: sampleData })
  })

  it.each([0, 11, 8.5, '8'])('強度 %j 不合法時指出錯誤位置', (rpe) => {
    const file = fileWith((file) => {
      ;(file.data.workouts[0].exercises[0].sets[1] as { rpe?: unknown }).rpe = rpe
    })
    expect(parse(file)).toEqual({
      ok: false,
      error: 'workouts[0].exercises[0].sets[1].rpe 格式錯誤',
    })
  })

  it('v4 的檔案（還沒有範本）遷移成沒有任何範本', () => {
    const v4 = fileWith((file) => {
      file.schemaVersion = 4
      delete (file.data as Partial<BackupData>).templates
    })
    expect(parse(v4)).toEqual({ ok: true, data: { ...sampleData, templates: [] } })
  })

  it('每一組的完成勾選（done）是選填的布林：沒有這個欄位的舊備份照常匯入，不需要遷移', () => {
    const withDone = fileWith((file) => {
      ;(file.data.workouts[0].exercises[0].sets[0] as { done?: boolean }).done = false
      ;(file.data.workouts[0].exercises[0].sets[1] as { done?: boolean }).done = true
    })
    const result = parse(withDone)
    expect(result.ok && result.data.workouts[0].exercises[0].sets.map((set) => set.done)).toEqual([
      false,
      true,
    ])
  })

  it.each([1, 'false', null])('完成勾選 %j 不是布林時指出錯誤位置', (done) => {
    const file = fileWith((file) => {
      ;(file.data.workouts[0].exercises[0].sets[1] as { done?: unknown }).done = done
    })
    expect(parse(file)).toEqual({
      ok: false,
      error: 'workouts[0].exercises[0].sets[1].done 格式錯誤',
    })
  })

  it('v1 的設定格式錯誤時，遷移後照樣指出錯誤位置', () => {
    const v1 = fileWith((file) => {
      file.schemaVersion = 1
      ;(file.data as { settings: unknown }).settings = 'kg'
    })
    expect(parse(v1)).toEqual({ ok: false, error: 'settings 格式錯誤' })
  })

  it('舊版的檔案先遷移再驗證', () => {
    // 假設 v5 的設定以 unit 記錄重量單位，v6 改名為 weightUnit
    const v5 = fileWith((file) => {
      const { weightUnit, ...rest } = file.data.settings
      ;(file.data as { settings: unknown }).settings = { ...rest, unit: weightUnit }
    })
    const migrations: BackupMigrations = {
      5: (data) => {
        const { unit, ...settings } = data.settings as Record<string, unknown>
        return { ...data, settings: { ...settings, weightUnit: unit } }
      },
    }

    expect(parse(v5)).toEqual({ ok: false, error: '缺少 settings.weightUnit' })
    expect(parseBackupFile(JSON.stringify(v5), { migrations, currentVersion: 6 })).toEqual({
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

  it('範本引用了不存在的動作時拒絕，和訓練引用的缺少動作一起列出', () => {
    const file = fileWith((file) => {
      referencing(file, 'no-such-preset')
      file.data.templates[0].exercises.push(
        { id: 'te-3', exerciseId: 'custom-deleted', setCount: 3 },
        { id: 'te-4', exerciseId: 'no-such-preset', setCount: 3 },
      )
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
