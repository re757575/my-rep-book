import { Plus, Trash2 } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import type { SetField, WorkoutExercise } from '@/domain'
import { SetFields } from './SetFields'

/**
 * 訓練動作：動作名稱、各組的輸入欄位與「新增一組」。
 * `actions` 顯示在動作名稱旁（排序、刪除動作），`children` 顯示在最下方（備註）。
 */
export function WorkoutExerciseCard({
  workoutExercise,
  exerciseName,
  actions,
  children,
  onAddSet,
  onChangeSetField,
  onDeleteSet,
}: {
  workoutExercise: WorkoutExercise
  exerciseName: string
  actions?: ReactNode
  children?: ReactNode
  onAddSet: () => void
  onChangeSetField: (setId: string, field: SetField, value: number | null) => void
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
      <ol className="flex flex-col gap-2">
        {workoutExercise.sets.map((set, index) => (
          <li key={set.id} className="flex items-center gap-2">
            <span className="w-6 text-center text-sm text-muted-foreground">{index + 1}</span>
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
