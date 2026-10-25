import { Plus, Trash2 } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'
import {
  formatLastPerformance,
  type LastPerformance,
  type SetField,
  type WorkoutExercise,
} from '@/domain'
import { cn } from '@/lib/utils'
import { SetFields } from './SetFields'

/**
 * 訓練動作：動作名稱、上次紀錄、各組的熱身標記與輸入欄位，以及「新增一組」。
 * `actions` 顯示在動作名稱旁（排序、刪除動作），`children` 顯示在最下方（備註）。
 */
export function WorkoutExerciseCard({
  workoutExercise,
  exerciseName,
  lastPerformance,
  actions,
  children,
  onAddSet,
  onChangeSetField,
  onToggleWarmup,
  onDeleteSet,
}: {
  workoutExercise: WorkoutExercise
  exerciseName: string
  /** 沒有上次紀錄時不顯示「上次」那一列 */
  lastPerformance: LastPerformance | undefined
  actions?: ReactNode
  children?: ReactNode
  onAddSet: () => void
  onChangeSetField: (setId: string, field: SetField, value: number | null) => void
  onToggleWarmup: (setId: string) => void
  onDeleteSet: (setId: string) => void
}) {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2 border-b pb-4">
      <header className="flex items-center gap-2">
        <h2 id={headingId} className="flex-1 font-semibold">
          {exerciseName}
        </h2>
        {actions}
      </header>
      {lastPerformance && (
        <p className="text-sm text-muted-foreground">{formatLastPerformance(lastPerformance)}</p>
      )}
      <ol className="flex flex-col gap-2">
        {workoutExercise.sets.map((set, index) => (
          <li
            key={set.id}
            className={cn(
              'flex items-center gap-2 rounded-md',
              set.isWarmup && 'bg-muted text-muted-foreground',
            )}
          >
            <span className="w-6 text-center text-sm text-muted-foreground">{index + 1}</span>
            <Toggle
              variant="outline"
              className="size-11 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              aria-label={`第 ${index + 1} 組熱身`}
              pressed={set.isWarmup}
              onPressedChange={() => onToggleWarmup(set.id)}
            >
              熱
            </Toggle>
            <SetFields
              values={set.values}
              setNumber={index + 1}
              onChange={(field, value) => onChangeSetField(set.id, field, value)}
            />
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto size-11 text-muted-foreground"
              aria-label={`刪除第 ${index + 1} 組`}
              onClick={() => onDeleteSet(set.id)}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ol>
      <Button variant="ghost" className="h-11" onClick={onAddSet}>
        <Plus aria-hidden="true" />
        新增一組
      </Button>
      {children}
    </section>
  )
}
