import type { ExerciseSessionProgress } from './exerciseRecords'
import type { LocalDate, WeightUnit } from './types'
import { formatRoundedWeight, formatWeight, kgToLb } from './units'

/** 進度圖表可以看的指標 */
export const PROGRESS_METRICS = ['maxWeight', 'oneRepMax', 'volume'] as const
export type ProgressMetric = (typeof PROGRESS_METRICS)[number]

/** 圖上的一個點：一次訓練。`kg` 是儲存的值，`value` 是目前重量單位的值（還沒四捨五入） */
export interface ProgressPoint {
  date: LocalDate
  kg: number
  value: number
}

function kgOf(session: ExerciseSessionProgress, metric: ProgressMetric): number {
  switch (metric) {
    case 'maxWeight':
      return session.topSet.weightKg
    case 'oneRepMax':
      return session.estimatedOneRepMaxKg
    case 'volume':
      return session.volumeKg
  }
}

/** 某個指標隨時間的點，由舊到新（`sessions` 由新到舊，同 `buildExerciseRecords`） */
export function buildProgressSeries(
  sessions: readonly ExerciseSessionProgress[],
  metric: ProgressMetric,
  weightUnit: WeightUnit,
): ProgressPoint[] {
  return sessions
    .map((session) => {
      const kg = kgOf(session, metric)
      return { date: session.date, kg, value: weightUnit === 'lb' ? kgToLb(kg) : kg }
    })
    .reverse()
}

/** 點的數值顯示（不含單位）：最大重量同訓練頁，估算 1RM 到 0.1，訓練量加千分位 */
export function formatProgressValue(
  metric: ProgressMetric,
  kg: number,
  weightUnit: WeightUnit,
): string {
  switch (metric) {
    case 'maxWeight':
      return formatWeight(kg, weightUnit)
    case 'oneRepMax':
      return formatRoundedWeight(kg, weightUnit)
    case 'volume':
      return formatWeight(kg, weightUnit, { grouping: true })
  }
}

/** 一階的大小：1、2、2.5、5 乘以 10 的次方中，剛好夠用的那一個 */
function niceStep(rawStep: number): number {
  const magnitude = 10 ** Math.floor(Math.log10(rawStep))
  const fraction = rawStep / magnitude
  const nice = [1, 2, 2.5, 5, 10].find((candidate) => fraction <= candidate + 1e-9) ?? 10
  return nice * magnitude
}

/**
 * Y 軸的乾淨刻度：涵蓋 `min` 到 `max`、大約 `count` 個，間隔是 1、2、2.5、5 乘以 10 的次方。
 * 回傳的 `min`、`max` 是第一個與最後一個刻度。`min` 等於 `max`（只有一個值，或每次都一樣）時
 * 以它為中心上下各留一階，圖才不會是一條貼在邊上的線。折線圖不必從 0 開始。
 */
export function niceTicks(
  min: number,
  max: number,
  count = 4,
): { ticks: number[]; min: number; max: number } {
  if (min === max) {
    const pad = niceStep(Math.max(Math.abs(min) * 0.1, 1) / 2)
    return niceTicks(min - pad, max + pad, count)
  }
  const step = niceStep((max - min) / Math.max(count - 1, 1))
  const first = Math.floor(min / step + 1e-9) * step
  const last = Math.ceil(max / step - 1e-9) * step
  const ticks: number[] = []
  // 以整數倍數相乘再除，避免 0.1 + 0.2 這類浮點誤差累積
  for (let i = 0; first + i * step <= last + step / 1e6; i += 1) {
    ticks.push(Math.round((first + i * step) * 1e6) / 1e6)
  }
  return { ticks, min: ticks[0], max: ticks[ticks.length - 1] }
}
