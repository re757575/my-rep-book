import { isWorkingSet } from './setTypes'
import { formatDuration } from './duration'
import { heaviestSet } from './exerciseRecords'
import { formatWeightReps } from './formatSet'
import { isFinishedSet } from './setDone'
import type { SetValues, WeightUnit, WorkoutSet } from './types'
import { formatWeight } from './units'

type ValuesOf<T extends SetValues['type']> = Extract<SetValues, { type: T }>

function sum(numbers: number[]) {
  return numbers.reduce((total, value) => total + value, 0)
}

/** 距離最多顯示 2 位小數，不補零 */
function formatDistance(km: number) {
  return String(Math.round(km * 100) / 100)
}

/**
 * 一個訓練動作的總計，收合時顯示在動作名稱下方，例如
 * `3 組 · 最重 60kg×8 · 訓練量 1,440 kg`、`3 組 · 共 24 下`、`2 組 · 共 03:00`、`1 組 · 5 km · 30:00`。
 * 只算完整的正式組（同每日摘要）；一組都沒有時回傳「尚未記錄正式組」。
 */
export function formatWorkoutExerciseSummary(
  sets: readonly WorkoutSet[],
  weightUnit: WeightUnit,
): string {
  const values = sets
    .filter((set) => isWorkingSet(set) && isFinishedSet(set))
    .map((set) => set.values)
  if (values.length === 0) return '尚未記錄正式組'
  const count = `${values.length} 組`

  switch (values[0].type) {
    case 'weight_reps': {
      const weightReps = (values as ValuesOf<'weight_reps'>[]).map(({ weightKg, reps }) => ({
        weightKg: weightKg ?? 0,
        reps: reps ?? 0,
      }))
      const volume = sum(weightReps.map(({ weightKg, reps }) => weightKg * reps))
      return [
        count,
        `最重 ${formatWeightReps(heaviestSet(weightReps), weightUnit)}`,
        `訓練量 ${formatWeight(volume, weightUnit, { grouping: true })} ${weightUnit}`,
      ].join(' · ')
    }
    case 'reps':
      return `${count} · 共 ${sum((values as ValuesOf<'reps'>[]).map(({ reps }) => reps ?? 0))} 下`
    case 'duration':
      return `${count} · 共 ${formatDuration(sum((values as ValuesOf<'duration'>[]).map(({ durationSec }) => durationSec ?? 0)))}`
    case 'distance_duration': {
      const items = values as ValuesOf<'distance_duration'>[]
      const km = sum(items.map(({ distanceKm }) => distanceKm ?? 0))
      const sec = sum(items.map(({ durationSec }) => durationSec ?? 0))
      return `${count} · ${formatDistance(km)} km · ${formatDuration(sec)}`
    }
  }
}
