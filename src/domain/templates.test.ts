import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TEMPLATE_SETS,
  MAX_TEMPLATE_NAME_LENGTH,
  MAX_TEMPLATE_SETS,
  addTemplateExercise,
  applyTemplate,
  buildTemplateFromWorkout,
  formatTemplateSummary,
  moveTemplateExercise,
  parseTemplateName,
  removeExerciseFromTemplate,
  removeTemplateExercise,
  renameTemplate,
  setTemplateSetCount,
  summarizeTemplate,
  type TemplateExerciseInfo,
} from './templates'
import type {
  SetType,
  SetValues,
  TrackingType,
  Workout,
  WorkoutExercise,
  WorkoutTemplate,
} from './types'

const T = '2026-10-01T00:00:00.000Z'
const NOW = '2026-10-24T08:00:00.000Z'
const BENCH = 'barbell-bench-press'
const FLY = 'dumbbell-fly'
const PLANK = 'plank'

function idGenerator(prefix = 'id') {
  let next = 0
  return () => `${prefix}-${++next}`
}

const wr = (weightKg: number | null, reps: number | null): SetValues => ({
  type: 'weight_reps',
  weightKg,
  reps,
})

function workoutOf(
  items: { exerciseId: string; sets: [SetValues, SetType?][] }[],
  date = '2026-10-20',
): Workout {
  return {
    date,
    exercises: items.map(({ exerciseId, sets }, e) => ({
      id: `e-${e}`,
      exerciseId,
      note: '備註不會進範本',
      sets: sets.map(([values, setType], s) => ({
        id: `e-${e}-s-${s}`,
        setType: setType ?? 'regular',
        rpe: 8,
        values,
      })),
    })),
    createdAt: T,
    updatedAt: T,
  }
}

function templateOf(...setCounts: [exerciseId: string, setCount: number][]): WorkoutTemplate {
  return {
    id: 'tpl-1',
    name: '推日',
    exercises: setCounts.map(([exerciseId, setCount], index) => ({
      id: `te-${index}`,
      exerciseId,
      setCount,
    })),
    createdAt: T,
    updatedAt: T,
  }
}

describe('parseTemplateName：範本名稱', () => {
  it('去掉前後空白後回傳名稱', () => {
    expect(parseTemplateName('  推日 ')).toEqual({ ok: true, value: '推日' })
  })

  it.each(['', '   '])('空白（%j）不合法', (text) => {
    expect(parseTemplateName(text)).toEqual({ ok: false, error: '請輸入範本名稱' })
  })

  it('最多 30 個字；去掉空白後剛好 30 個字合法', () => {
    const longest = '推'.repeat(MAX_TEMPLATE_NAME_LENGTH)
    expect(parseTemplateName(` ${longest} `)).toEqual({ ok: true, value: longest })
    expect(parseTemplateName(`${longest}日`)).toEqual({
      ok: false,
      error: `名稱最多 ${MAX_TEMPLATE_NAME_LENGTH} 個字`,
    })
  })
})

describe('buildTemplateFromWorkout：把一天的訓練存成範本', () => {
  it('依順序記下動作，組數是正式組數：熱身組不算，遞減與力竭算，不論有沒有填完', () => {
    const workout = workoutOf([
      {
        exerciseId: BENCH,
        sets: [[wr(40, 10), 'warmup'], [wr(60, 8)], [wr(60, null)], [wr(50, 8), 'drop']],
      },
      { exerciseId: FLY, sets: [[wr(10, 12)], [wr(10, 10), 'failure']] },
    ])
    const template = buildTemplateFromWorkout(workout, '推日', {
      now: NOW,
      createId: idGenerator(),
    })
    expect(template).toEqual({
      id: 'id-1',
      name: '推日',
      exercises: [
        { id: 'id-2', exerciseId: BENCH, setCount: 3 },
        { id: 'id-3', exerciseId: FLY, setCount: 2 },
      ],
      createdAt: NOW,
      updatedAt: NOW,
    })
  })

  it('只有熱身組的動作至少 1 組；超過上限時夾在 20 組', () => {
    const workout = workoutOf([
      { exerciseId: BENCH, sets: [[wr(40, 10), 'warmup']] },
      { exerciseId: FLY, sets: Array.from({ length: 25 }, () => [wr(10, 10)] as [SetValues]) },
    ])
    const { exercises } = buildTemplateFromWorkout(workout, '推日', {
      now: NOW,
      createId: idGenerator(),
    })
    expect(exercises.map((item) => item.setCount)).toEqual([1, MAX_TEMPLATE_SETS])
  })

  it('同一個動作出現兩次時，範本裡也是兩個動作，各有自己的 ID', () => {
    const workout = workoutOf([
      { exerciseId: BENCH, sets: [[wr(60, 8)]] },
      { exerciseId: BENCH, sets: [[wr(50, 12)], [wr(50, 12)]] },
    ])
    const { exercises } = buildTemplateFromWorkout(workout, '推日', {
      now: NOW,
      createId: idGenerator(),
    })
    expect(exercises).toEqual([
      { id: 'id-2', exerciseId: BENCH, setCount: 1 },
      { id: 'id-3', exerciseId: BENCH, setCount: 2 },
    ])
  })
})

describe('summarizeTemplate：動作數與組數', () => {
  it('加總各動作的組數', () => {
    expect(summarizeTemplate(templateOf([BENCH, 3], [FLY, 2], [PLANK, 4]))).toEqual({
      exerciseCount: 3,
      setCount: 9,
    })
  })
})

describe('formatTemplateSummary：範本的一行摘要', () => {
  it('動作數與總組數', () => {
    expect(formatTemplateSummary(templateOf([BENCH, 3], [FLY, 2], [PLANK, 4]))).toBe(
      '3 個動作 · 9 組',
    )
  })
})

describe('applyTemplate：把範本的動作加到訓練', () => {
  const info = new Map<string, TemplateExerciseInfo>([
    [
      BENCH,
      {
        trackingType: 'weight_reps',
        lastPerformance: { date: '2026-10-20', sets: [wr(60, 8), wr(62.5, 6)] },
      },
    ],
    [FLY, { trackingType: 'weight_reps', lastPerformance: undefined }],
    [PLANK, { trackingType: 'duration', lastPerformance: undefined }],
  ])

  it('每個動作建立範本記的組數：第一組依上次紀錄預填，其餘複製前一組，都是未完成的正式組且不帶強度', () => {
    const { workout, addedIds } = applyTemplate(
      templateOf([BENCH, 3], [FLY, 2]),
      undefined,
      '2026-10-24',
      info,
      { now: NOW, createId: idGenerator() },
    )
    expect(workout).toEqual({
      date: '2026-10-24',
      createdAt: NOW,
      updatedAt: NOW,
      exercises: [
        {
          id: 'id-1',
          exerciseId: BENCH,
          note: '',
          sets: [
            { id: 'id-2', setType: 'regular', done: false, values: wr(60, 8) },
            { id: 'id-3', setType: 'regular', done: false, values: wr(60, 8) },
            { id: 'id-4', setType: 'regular', done: false, values: wr(60, 8) },
          ],
        },
        {
          id: 'id-5',
          exerciseId: FLY,
          note: '',
          sets: [
            { id: 'id-6', setType: 'regular', done: false, values: wr(null, null) },
            { id: 'id-7', setType: 'regular', done: false, values: wr(null, null) },
          ],
        },
      ],
    })
    expect(addedIds).toEqual(['id-1', 'id-5'])
  })

  it('依動作的記錄類型建立欄位', () => {
    const { workout } = applyTemplate(templateOf([PLANK, 1]), undefined, '2026-10-24', info, {
      now: NOW,
      createId: idGenerator(),
    })
    expect(workout?.exercises[0].sets[0].values).toEqual({ type: 'duration', durationSec: null })
  })

  it('接在已有的訓練最後面，不取代也不合併同名的動作；其餘欄位不變，更新時間改變', () => {
    const existing = workoutOf([{ exerciseId: BENCH, sets: [[wr(100, 1)]] }], '2026-10-24')
    const { workout, addedIds } = applyTemplate(
      templateOf([BENCH, 1]),
      existing,
      '2026-10-24',
      info,
      { now: NOW, createId: idGenerator() },
    )
    expect(workout?.exercises.map((item: WorkoutExercise) => item.exerciseId)).toEqual([
      BENCH,
      BENCH,
    ])
    expect(workout?.exercises[0]).toBe(existing.exercises[0])
    expect(workout).toMatchObject({ createdAt: T, updatedAt: NOW })
    expect(addedIds).toHaveLength(1)
  })

  it('找不到動作資訊的動作略過；一個也加不了時訓練不變', () => {
    const partial = applyTemplate(
      templateOf(['unknown', 2], [FLY, 1]),
      undefined,
      '2026-10-24',
      info,
      { now: NOW, createId: idGenerator() },
    )
    expect(partial.workout?.exercises.map((item) => item.exerciseId)).toEqual([FLY])

    const existing = workoutOf([{ exerciseId: BENCH, sets: [[wr(100, 1)]] }], '2026-10-24')
    const none = applyTemplate(templateOf(['unknown', 2]), existing, '2026-10-24', info, {
      now: NOW,
      createId: idGenerator(),
    })
    expect(none.workout).toBe(existing)
    expect(none.addedIds).toEqual([])
    expect(
      applyTemplate(templateOf(['unknown', 2]), undefined, '2026-10-24', info, {
        now: NOW,
        createId: idGenerator(),
      }).workout,
    ).toBeUndefined()
  })

  it.each<[TrackingType]>([['reps'], ['distance_duration']])('支援 %s', (trackingType) => {
    const custom = new Map([['x', { trackingType, lastPerformance: undefined }]])
    const { workout } = applyTemplate(templateOf(['x', 2]), undefined, '2026-10-24', custom, {
      now: NOW,
      createId: idGenerator(),
    })
    expect(workout?.exercises[0].sets.map((set) => set.values.type)).toEqual([
      trackingType,
      trackingType,
    ])
  })
})

describe('範本的編輯', () => {
  const base = templateOf([BENCH, 3], [FLY, 2], [PLANK, 1])

  it('renameTemplate：改名並更新時間', () => {
    expect(renameTemplate(base, '拉日', NOW)).toEqual({ ...base, name: '拉日', updatedAt: NOW })
  })

  it('setTemplateSetCount：改指定動作的組數，夾在 1–20，其他動作不變', () => {
    expect(setTemplateSetCount(base, 'te-1', 5, NOW).exercises.map((e) => e.setCount)).toEqual([
      3, 5, 1,
    ])
    expect(setTemplateSetCount(base, 'te-1', 0, NOW).exercises[1].setCount).toBe(1)
    expect(setTemplateSetCount(base, 'te-1', 99, NOW).exercises[1].setCount).toBe(MAX_TEMPLATE_SETS)
    expect(setTemplateSetCount(base, 'missing', 5, NOW)).toBe(base)
  })

  it('moveTemplateExercise：和相鄰的動作交換；第一個上移、最後一個下移時不變', () => {
    const ids = (t: WorkoutTemplate) => t.exercises.map((e) => e.id)
    expect(ids(moveTemplateExercise(base, 'te-1', 'up', NOW))).toEqual(['te-1', 'te-0', 'te-2'])
    expect(ids(moveTemplateExercise(base, 'te-1', 'down', NOW))).toEqual(['te-0', 'te-2', 'te-1'])
    expect(moveTemplateExercise(base, 'te-0', 'up', NOW)).toBe(base)
    expect(moveTemplateExercise(base, 'te-2', 'down', NOW)).toBe(base)
    expect(moveTemplateExercise(base, 'missing', 'up', NOW)).toBe(base)
  })

  it('removeTemplateExercise：移除指定動作；只剩一個動作時不移除', () => {
    expect(removeTemplateExercise(base, 'te-1', NOW).exercises.map((e) => e.id)).toEqual([
      'te-0',
      'te-2',
    ])
    const single = templateOf([BENCH, 3])
    expect(removeTemplateExercise(single, 'te-0', NOW)).toBe(single)
    expect(removeTemplateExercise(base, 'missing', NOW)).toBe(base)
  })

  it('addTemplateExercise：加到最後面，預設 3 組', () => {
    const added = addTemplateExercise(base, PLANK, { now: NOW, createId: () => 'new-id' })
    expect(added.exercises.at(-1)).toEqual({
      id: 'new-id',
      exerciseId: PLANK,
      setCount: DEFAULT_TEMPLATE_SETS,
    })
    expect(DEFAULT_TEMPLATE_SETS).toBe(3)
    expect(added.updatedAt).toBe(NOW)
  })

  describe('removeExerciseFromTemplate：刪除自訂動作時移除範本裡的它', () => {
    it('移除所有該動作的項目，更新時間', () => {
      const twice = templateOf([BENCH, 3], [FLY, 2], [BENCH, 1])
      const result = removeExerciseFromTemplate(twice, BENCH, NOW)
      expect(result?.exercises.map((e) => e.exerciseId)).toEqual([FLY])
      expect(result?.updatedAt).toBe(NOW)
    })

    it('沒有用到該動作時範本不變', () => {
      expect(removeExerciseFromTemplate(base, 'custom-x', NOW)).toBe(base)
    })

    it('沒有任何動作剩下時回傳 undefined（整個範本刪除）', () => {
      expect(removeExerciseFromTemplate(templateOf([BENCH, 3]), BENCH, NOW)).toBeUndefined()
    })
  })
})
