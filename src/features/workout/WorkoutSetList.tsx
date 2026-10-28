import { formatEffort, formatSetValues, SET_TYPE_LABELS, type WorkoutSet } from '@/domain'
import { useEffortSettings } from '@/features/effort/effortStore'
import { useWeightUnit } from '@/features/settings/settingsContext'
import { cn } from '@/lib/utils'

/** 唯讀的組清單：每組一列，熱身、遞減、力竭的組前面標示類型，正式組不標；未完成的組（US-44）標示「未完成」；有強度的組後面標示 RPE 或 RIR（US-39）。動作歷史與歷史的日明細共用 */
export function WorkoutSetList({ sets }: { sets: readonly WorkoutSet[] }) {
  const weightUnit = useWeightUnit()
  const { scale } = useEffortSettings()
  return (
    <ol aria-label="組" className="flex flex-col gap-1">
      {sets.map((set) => (
        <li
          key={set.id}
          className={cn(
            'flex items-center gap-2',
            (set.setType === 'warmup' || set.done === false) && 'text-muted-foreground',
          )}
        >
          {set.setType !== 'regular' && (
            <span className="rounded-sm bg-muted px-1.5 text-xs text-muted-foreground">
              {SET_TYPE_LABELS[set.setType]}
            </span>
          )}
          {/* 沒做的組（從範本加入或複製進來、之後沒勾選也沒改過，US-44）不計入任何統計 */}
          {set.done === false && (
            <span className="rounded-sm bg-muted px-1.5 text-xs text-muted-foreground">未完成</span>
          )}
          <span>
            {formatSetValues(set.values, weightUnit)}
            {set.rpe !== undefined && ` · ${formatEffort(set.rpe, scale)}`}
          </span>
        </li>
      ))}
    </ol>
  )
}
