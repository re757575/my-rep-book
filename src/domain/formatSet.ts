import { formatDuration } from './duration'
import type { LastPerformance } from './lastPerformance'
import type { SetValues, WeightUnit } from './types'
import { formatWeight } from './units'

/** 尚未填寫的欄位 */
const BLANK = '—'

function show(value: number | null, format: (value: number) => string = String) {
  return value === null ? BLANK : format(value)
}

/**
 * 一組數值的簡短顯示，例如 `60kg×8`、`8下＋10kg`、`01:30`、`5km 25:00`。
 * 重量以 `weightUnit` 顯示（lb 四捨五入到 0.1，例如 `135.0lb×8`），距離永遠以 km 顯示。
 */
export function formatSetValues(values: SetValues, weightUnit: WeightUnit): string {
  const weight = (kg: number) => formatWeight(kg, weightUnit)
  switch (values.type) {
    case 'weight_reps':
      return `${show(values.weightKg, weight)}${weightUnit}×${show(values.reps)}`
    case 'reps':
      return values.addedWeightKg
        ? `${show(values.reps)}下＋${weight(values.addedWeightKg)}${weightUnit}`
        : `${show(values.reps)}下`
    case 'duration':
      return show(values.durationSec, formatDuration)
    case 'distance_duration':
      return `${show(values.distanceKm)}km ${show(values.durationSec, formatDuration)}`
  }
}

/** 動作標題下方的上次紀錄，例如 `上次（10/20）：60kg×8、60kg×8、62.5kg×6` */
export function formatLastPerformance(
  { date, sets }: LastPerformance,
  weightUnit: WeightUnit,
): string {
  const [, month, day] = date.split('-').map(Number)
  const values = sets.map((set) => formatSetValues(set, weightUnit))
  return `上次（${month}/${day}）：${values.join('、')}`
}
