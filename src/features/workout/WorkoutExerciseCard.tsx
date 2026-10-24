import { Plus } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@/components/ui/button'
import type { SetValues, WorkoutExercise } from '@/domain'
import { SetFields } from './SetFields'

/** 訓練動作：動作名稱、各組的輸入欄位與「新增一組」 */
export function WorkoutExerciseCard({
  workoutExercise,
  exerciseName,
  onAddSet,
  onChangeSet,
}: {
  workoutExercise: WorkoutExercise
  exerciseName: string
  onAddSet: () => void
  onChangeSet: (setId: string, change: (values: SetValues) => SetValues) => void
}) {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2 border-b pb-4">
      <h2 id={headingId} className="font-semibold">
        {exerciseName}
      </h2>
      <ol className="flex flex-col gap-2">
        {workoutExercise.sets.map((set, index) => (
          <li key={set.id} className="flex items-center gap-2">
            <span className="w-6 text-center text-sm text-muted-foreground">{index + 1}</span>
            <SetFields
              values={set.values}
              setNumber={index + 1}
              onChange={(change) => onChangeSet(set.id, change)}
            />
          </li>
        ))}
      </ol>
      <Button variant="ghost" className="h-11" onClick={onAddSet}>
        <Plus aria-hidden="true" />
        新增一組
      </Button>
    </section>
  )
}
