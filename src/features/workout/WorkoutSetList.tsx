import { formatSetValues, type WorkoutSet } from '@/domain'
import { useWeightUnit } from '@/features/settings/settingsContext'
import { cn } from '@/lib/utils'

/** 唯讀的組清單：每組一列，熱身組前面標示「熱身」。動作歷史與歷史的日明細共用 */
export function WorkoutSetList({ sets }: { sets: readonly WorkoutSet[] }) {
  const weightUnit = useWeightUnit()
  return (
    <ol aria-label="組" className="flex flex-col gap-1">
      {sets.map((set) => (
        <li
          key={set.id}
          className={cn('flex items-center gap-2', set.isWarmup && 'text-muted-foreground')}
        >
          {set.isWarmup && (
            <span className="rounded-sm bg-muted px-1.5 text-xs text-muted-foreground">熱身</span>
          )}
          <span>{formatSetValues(set.values, weightUnit)}</span>
        </li>
      ))}
    </ol>
  )
}
