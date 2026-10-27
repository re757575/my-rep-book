import { formatSetValues, SET_TYPE_LABELS, type WorkoutSet } from '@/domain'
import { useWeightUnit } from '@/features/settings/settingsContext'
import { cn } from '@/lib/utils'

/** 唯讀的組清單：每組一列，熱身、遞減、力竭的組前面標示類型，正式組不標。動作歷史與歷史的日明細共用 */
export function WorkoutSetList({ sets }: { sets: readonly WorkoutSet[] }) {
  const weightUnit = useWeightUnit()
  return (
    <ol aria-label="組" className="flex flex-col gap-1">
      {sets.map((set) => (
        <li
          key={set.id}
          className={cn(
            'flex items-center gap-2',
            set.setType === 'warmup' && 'text-muted-foreground',
          )}
        >
          {set.setType !== 'regular' && (
            <span className="rounded-sm bg-muted px-1.5 text-xs text-muted-foreground">
              {SET_TYPE_LABELS[set.setType]}
            </span>
          )}
          <span>{formatSetValues(set.values, weightUnit)}</span>
        </li>
      ))}
    </ol>
  )
}
