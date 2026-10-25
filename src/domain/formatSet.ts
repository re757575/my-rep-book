import { formatDuration } from './duration'
import type { LastPerformance } from './lastPerformance'
import type { SetValues } from './types'

/** 尚未填寫的欄位 */
const BLANK = '—'

function show(value: number | null, format: (value: number) => string = String) {
  return value === null ? BLANK : format(value)
}

/** 一組數值的簡短顯示，例如 `60kg×8`、`8下＋10kg`、`01:30`、`5km 25:00`；重量一律以 kg 顯示 */
export function formatSetValues(values: SetValues): string {
  switch (values.type) {
    case 'weight_reps':
      return `${show(values.weightKg)}kg×${show(values.reps)}`
    case 'reps':
      return values.addedWeightKg
        ? `${show(values.reps)}下＋${values.addedWeightKg}kg`
        : `${show(values.reps)}下`
    case 'duration':
      return show(values.durationSec, formatDuration)
    case 'distance_duration':
      return `${show(values.distanceKm)}km ${show(values.durationSec, formatDuration)}`
  }
}

/** 動作標題下方的上次紀錄，例如 `上次（10/20）：60kg×8、60kg×8、62.5kg×6` */
export function formatLastPerformance({ date, sets }: LastPerformance): string {
  const [, month, day] = date.split('-').map(Number)
  return `上次（${month}/${day}）：${sets.map(formatSetValues).join('、')}`
}
