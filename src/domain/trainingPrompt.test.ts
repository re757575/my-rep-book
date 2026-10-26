import { describe, expect, it } from 'vitest'
import { buildExerciseRecords } from './exerciseRecords'
import {
  buildTrainingPrompt,
  hasPromptData,
  promptRange,
  type TrainingPromptInput,
} from './trainingPrompt'
import type { BodyWeightEntry, ExerciseBase, SetValues, Workout } from './types'

const T = '2026-10-01T00:00:00.000Z'

type FixtureSet = [values: SetValues, warmup?: 'warmup']
const wr = (weightKg: number | null, reps: number | null): SetValues => ({
  type: 'weight_reps',
  weightKg,
  reps,
})

function workout(
  date: string,
  items: { exerciseId: string; note?: string; sets: FixtureSet[] }[],
): Workout {
  return {
    date,
    exercises: items.map(({ exerciseId, note = '', sets }, e) => ({
      id: `${date}-${e}`,
      exerciseId,
      note,
      sets: sets.map(([values, warmup], s) => ({
        id: `${date}-${e}-${s}`,
        isWarmup: warmup === 'warmup',
        values,
      })),
    })),
    createdAt: T,
    updatedAt: T,
  }
}

const weight = (date: string, weightKg: number): BodyWeightEntry => ({
  date,
  weightKg,
  updatedAt: T,
})

const exercises = new Map<string, Pick<ExerciseBase, 'nameZh' | 'primaryMuscles'>>([
  ['barbell-bench-press', { nameZh: '槓鈴臥推', primaryMuscles: ['chest'] }],
  ['custom-run', { nameZh: '戶外跑步', primaryMuscles: ['full_body'] }],
])

const workouts = [
  workout('2026-10-22', [
    {
      exerciseId: 'barbell-bench-press',
      sets: [[wr(62.5, 5)], [wr(60, null)]],
    },
  ]),
  workout('2026-10-20', [
    {
      exerciseId: 'barbell-bench-press',
      note: '左肩不適\n下次減重',
      sets: [[wr(40, 10), 'warmup'], [wr(60, 8)], [wr(60, 8)]],
    },
    {
      exerciseId: 'custom-run',
      sets: [[{ type: 'distance_duration', distanceKm: 5, durationSec: 1800 }]],
    },
    // 沒有任何數值也沒有備註，略過
    { exerciseId: 'custom-run', sets: [[{ type: 'duration', durationSec: null }]] },
  ]),
]

const input: TrainingPromptInput = {
  from: '2026-10-19',
  to: '2026-10-25',
  weightUnit: 'kg',
  heightCm: 175,
  birthDate: '1990-10-26',
  workouts,
  exercises,
  bodyWeights: [
    // 期間之前的體重只用來算 7 日平均與比上週增減
    weight('2026-10-14', 73),
    weight('2026-10-20', 72.5),
    weight('2026-10-24', 72),
  ],
  records: new Map([
    ['barbell-bench-press', buildExerciseRecords(workouts, 'barbell-bench-press')!],
  ]),
}

describe('buildTrainingPrompt：把紀錄整理成貼到外部 AI 的提示詞', () => {
  it('依序包含請求、基本資料、期間統計、個人紀錄、訓練明細與體重紀錄', () => {
    expect(buildTrainingPrompt(input))
      .toBe(`你是一位專業的肌力與體能教練。以下是我在 2026/10/19（一）到 2026/10/25（日）的健身紀錄，請根據這些資料：

1. 分析訓練頻率、訓練量與各部位的平衡，指出練得太少或太多的部位
2. 找出進步中與停滯的動作，說明可能的原因
3. 建議接下來一週的訓練安排，包含動作、組數、次數與重量

說明：重量單位為 kg，距離為 km；標示「熱身」的是熱身組，不計入統計；估算 1RM 以 Epley 公式計算：重量 ×（1 + 次數 ÷ 30）。

## 基本資料
- 年齡：35 歲
- 身高：175 cm
- 最近體重：72 kg（2026/10/24（六），7 日平均 72.3 kg，比上週 -0.8 kg）

## 期間統計
- 訓練天數：2 天
- 正式組數：4 組
- 總訓練量：1,272.5 kg
- 各部位組數（依主要部位）：胸 3 組、背 0 組、肩 0 組、手臂：二頭 0 組、手臂：三頭 0 組、腿：股四頭／臀 0 組、腿：腿後側 0 組、小腿 0 組、核心／腹部 0 組、有氧／全身 1 組

## 個人紀錄（全部歷史）
- 槓鈴臥推：最大重量 62.5kg×5（2026/10/22（四））、估算 1RM 76 kg（60kg×8，2026/10/20（二））

## 訓練明細
### 2026/10/20（二）
- 槓鈴臥推：熱身 40kg×10、60kg×8、60kg×8
  - 備註：左肩不適 下次減重
- 戶外跑步：5km 30:00
### 2026/10/22（四）
- 槓鈴臥推：62.5kg×5

## 體重紀錄
- 2026/10/20（二）：72.5 kg（7 日平均 72.8 kg）
- 2026/10/24（六）：72 kg（7 日平均 72.3 kg）
`)
  })

  it('只帶入期間最後一天的年齡，不放生日本身', () => {
    const prompt = buildTrainingPrompt(input)
    expect(prompt).not.toContain('1990')
    // 期間最後一天正好是生日時已滿歲
    expect(buildTrainingPrompt({ ...input, to: '2026-10-26' })).toContain('- 年齡：36 歲')
  })

  it('以目前的重量單位顯示', () => {
    const prompt = buildTrainingPrompt({ ...input, weightUnit: 'lb' })
    expect(prompt).toContain('重量單位為 lb')
    expect(prompt).toContain('- 槓鈴臥推：熱身 88.2lb×10、132.3lb×8、132.3lb×8')
    expect(prompt).toContain('- 最近體重：158.7 lb')
  })

  it('沒有生日、身高、體重與個人紀錄時省略那些段落', () => {
    const prompt = buildTrainingPrompt({
      ...input,
      heightCm: null,
      birthDate: null,
      bodyWeights: [],
      records: new Map(),
    })
    expect(prompt).not.toContain('## 基本資料')
    expect(prompt).not.toContain('## 個人紀錄')
    expect(prompt).not.toContain('## 體重紀錄')
    expect(prompt).toContain('## 期間統計')
    expect(prompt).toContain('## 訓練明細')
  })

  it('只有體重、沒有訓練時省略訓練明細，統計為 0', () => {
    const prompt = buildTrainingPrompt({ ...input, workouts: [], records: new Map() })
    expect(prompt).not.toContain('## 訓練明細')
    expect(prompt).toContain('- 訓練天數：0 天')
    expect(prompt).toContain('## 體重紀錄')
  })
})

describe('promptRange：最近幾週的期間', () => {
  it.each<[4 | 8 | 12, [string, string]]>([
    [4, ['2026-09-27', '2026-10-24']],
    [8, ['2026-08-30', '2026-10-24']],
    [12, ['2026-08-02', '2026-10-24']],
  ])('%d 週 → %j', (weeks, expected) => {
    expect(promptRange(weeks, '2026-10-24')).toEqual(expected)
  })
})

describe('hasPromptData：期間內有沒有可以分析的紀錄', () => {
  const range = { from: '2026-10-19', to: '2026-10-25' }

  it('有訓練或期間內有體重時為 true', () => {
    expect(hasPromptData({ ...range, workouts, bodyWeights: [] })).toBe(true)
    expect(hasPromptData({ ...range, workouts: [], bodyWeights: [weight('2026-10-25', 72)] })).toBe(
      true,
    )
  })

  it('只有期間之外的體重時為 false', () => {
    expect(hasPromptData({ ...range, workouts: [], bodyWeights: [weight('2026-10-18', 72)] })).toBe(
      false,
    )
  })
})
