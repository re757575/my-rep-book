import { SET_TYPE_LABELS } from './setTypes'
import { calculateAge } from './age'
import { buildBodyWeightTrend, type BodyWeightTrendEntry } from './bodyWeightTrend'
import { addDays, formatDateWithYear } from './dates'
import type { ExerciseRecords } from './exerciseRecords'
import { formatSetValues, formatWeightReps } from './formatSet'
import { BROWSE_CATEGORY_LABELS } from './labels'
import { summarizePeriod } from './periodStats'
import { isCompleteSet } from './setValues'
import {
  BROWSE_CATEGORIES,
  type BodyWeightEntry,
  type ExerciseBase,
  type LocalDate,
  type WeightUnit,
  type Workout,
  type WorkoutSet,
} from './types'
import { formatRoundedWeight, formatWeight, formatWeightChange } from './units'

/** 產生提示詞需要的資料 */
export interface TrainingPromptInput {
  /** 期間（含頭尾） */
  from: LocalDate
  to: LocalDate
  weightUnit: WeightUnit
  heightCm: number | null
  /** 生日；提示詞只帶入期間最後一天的年齡，不放生日本身 */
  birthDate: LocalDate | null
  /** 期間內的訓練 */
  workouts: readonly Workout[]
  /** 動作庫的全部動作（含已隱藏、已封存），用來查名稱與部位 */
  exercises: ReadonlyMap<string, Pick<ExerciseBase, 'nameZh' | 'primaryMuscles'>>
  /** 全部的體重；7 日平均需要期間之前的體重，由這裡篩選出期間內的 */
  bodyWeights: readonly BodyWeightEntry[]
  /** 期間內做過的重量×次數動作，以全部歷史計算的個人紀錄 */
  records: ReadonlyMap<string, ExerciseRecords>
}

/** 可以選的期間長度（週） */
export const PROMPT_WEEKS = [4, 8, 12] as const
export type PromptWeeks = (typeof PROMPT_WEEKS)[number]

/** 最近 `weeks` 週的期間（含頭尾），算到 `today` 為止 */
export function promptRange(weeks: PromptWeeks, today: LocalDate): [LocalDate, LocalDate] {
  return [addDays(today, -7 * weeks + 1), today]
}

/** 期間內有沒有任何可以分析的紀錄（訓練或體重） */
export function hasPromptData({
  from,
  to,
  workouts,
  bodyWeights,
}: Pick<TrainingPromptInput, 'from' | 'to' | 'workouts' | 'bodyWeights'>): boolean {
  return workouts.length > 0 || bodyWeights.some(({ date }) => from <= date && date <= to)
}

function introduction({ from, to, weightUnit }: TrainingPromptInput): string[] {
  return [
    `你是一位專業的肌力與體能教練。以下是我在 ${formatDateWithYear(from)}到 ${formatDateWithYear(to)}的健身紀錄，請根據這些資料：`,
    '',
    '1. 分析訓練頻率、訓練量與各部位的平衡，指出練得太少或太多的部位',
    '2. 找出進步中與停滯的動作，說明可能的原因',
    '3. 建議接下來一週的訓練安排，包含動作、組數、次數與重量',
    '',
    `說明：重量單位為 ${weightUnit}，距離為 km；標示「熱身」的是熱身組，不計入統計；估算 1RM 以 Epley 公式計算：重量 ×（1 + 次數 ÷ 30）。`,
  ]
}

function profile(
  { to, birthDate, heightCm, weightUnit: unit }: TrainingPromptInput,
  latestWeight: BodyWeightTrendEntry | undefined,
): string[] {
  const lines: string[] = []
  if (birthDate !== null) lines.push(`- 年齡：${calculateAge(birthDate, to)} 歲`)
  if (heightCm !== null) lines.push(`- 身高：${heightCm} cm`)
  if (latestWeight) {
    const change =
      latestWeight.changeFromLastWeekKg === null
        ? ''
        : `，比上週 ${formatWeightChange(latestWeight.changeFromLastWeekKg, unit)} ${unit}`
    lines.push(
      `- 最近體重：${formatWeight(latestWeight.weightKg, unit)} ${unit}（${formatDateWithYear(latestWeight.date)}，7 日平均 ${formatRoundedWeight(latestWeight.averageKg, unit)} ${unit}${change}）`,
    )
  }
  return lines.length === 0 ? [] : ['## 基本資料', ...lines]
}

function periodSummary({ workouts, exercises, weightUnit }: TrainingPromptInput): string[] {
  const stats = summarizePeriod(workouts, exercises)
  const categories = BROWSE_CATEGORIES.map(
    (category) => `${BROWSE_CATEGORY_LABELS[category]} ${stats.setsByCategory[category]} 組`,
  ).join('、')
  return [
    '## 期間統計',
    `- 訓練天數：${stats.trainingDays} 天`,
    `- 正式組數：${stats.workingSetCount} 組`,
    `- 總訓練量：${formatWeight(stats.volumeKg, weightUnit, { grouping: true })} ${weightUnit}`,
    `- 各部位組數（依主要部位）：${categories}`,
  ]
}

function personalRecords({ records, exercises, weightUnit: unit }: TrainingPromptInput): string[] {
  if (records.size === 0) return []
  const lines = [...records].map(([exerciseId, { maxWeight, oneRepMax }]) => {
    const name = exercises.get(exerciseId)?.nameZh ?? exerciseId
    return (
      `- ${name}：最大重量 ${formatWeightReps(maxWeight.set, unit)}（${formatDateWithYear(maxWeight.date)}）、` +
      `估算 1RM ${formatRoundedWeight(oneRepMax.estimatedKg, unit)} ${unit}（${formatWeightReps(oneRepMax.set, unit)}，${formatDateWithYear(oneRepMax.date)}）`
    )
  })
  return ['## 個人紀錄（全部歷史）', ...lines]
}

/** 每次訓練的動作、各組數值（只列已填完的組）與備註；沒有任何數值也沒有備註的動作略過 */
function workoutDetails({ workouts, exercises, weightUnit }: TrainingPromptInput): string[] {
  if (workouts.length === 0) return []
  const lines = ['## 訓練明細']
  for (const workout of [...workouts].sort((a, b) => a.date.localeCompare(b.date))) {
    lines.push(`### ${formatDateWithYear(workout.date)}`)
    for (const item of workout.exercises) {
      const sets = item.sets
        .filter((set) => isCompleteSet(set.values))
        .map((set) => `${setTypeLabel(set)}${formatSetValues(set.values, weightUnit)}`)
      const note = item.note.trim()
      if (sets.length === 0 && note === '') continue
      const name = exercises.get(item.exerciseId)?.nameZh ?? item.exerciseId
      lines.push(`- ${name}：${sets.length === 0 ? '（未記錄數值）' : sets.join('、')}`)
      if (note !== '') lines.push(`  - 備註：${note.replace(/\s*\n\s*/g, ' ')}`)
    }
  }
  return lines
}

function bodyWeightLog(
  { weightUnit: unit }: TrainingPromptInput,
  inPeriod: BodyWeightTrendEntry[],
): string[] {
  if (inPeriod.length === 0) return []
  return [
    '## 體重紀錄',
    ...inPeriod.map(
      (entry) =>
        `- ${formatDateWithYear(entry.date)}：${formatWeight(entry.weightKg, unit)} ${unit}（7 日平均 ${formatRoundedWeight(entry.averageKg, unit)} ${unit}）`,
    ),
  ]
}

/** 正式組不標；熱身、遞減、力竭在數值前面標示，例如 `熱身 40kg×10` */
function setTypeLabel(set: WorkoutSet): string {
  return set.setType === 'regular' ? '' : `${SET_TYPE_LABELS[set.setType]} `
}

/**
 * 把一段期間的紀錄整理成可以貼到外部 AI 的提示詞（Markdown）：
 * 請 AI 分析並給出建議，接著附上基本資料、期間統計、個人紀錄、訓練明細與體重紀錄。
 * 沒有資料的段落省略。
 */
export function buildTrainingPrompt(input: TrainingPromptInput): string {
  const { from, to, bodyWeights } = input
  const trend = buildBodyWeightTrend(
    [...bodyWeights].sort((a, b) => a.date.localeCompare(b.date)),
  ).filter(({ date }) => from <= date && date <= to)

  const sections = [
    introduction(input),
    profile(input, trend.at(-1)),
    periodSummary(input),
    personalRecords(input),
    workoutDetails(input),
    bodyWeightLog(input, trend),
  ].filter((section) => section.length > 0)
  return sections.map((section) => section.join('\n')).join('\n\n') + '\n'
}
