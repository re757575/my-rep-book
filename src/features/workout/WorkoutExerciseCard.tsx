import { Plus } from 'lucide-react'
import { useId } from 'react'
import { Button } from '@/components/ui/button'
import type { SetValues, WorkoutExercise, WorkoutSet } from '@/domain'
import { NumberField } from './NumberField'

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
              set={set}
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

type WeightRepsValues = Extract<SetValues, { type: 'weight_reps' }>

/** 依記錄類型顯示該組需要的欄位；目前只支援「重量×次數」，重量一律以 kg 顯示 */
function SetFields({
  set,
  setNumber,
  onChange,
}: {
  set: WorkoutSet
  setNumber: number
  onChange: (change: (values: SetValues) => SetValues) => void
}) {
  const { values } = set
  if (values.type !== 'weight_reps') return null

  /** 只改這個欄位；其他欄位以儲存中的最新值為準 */
  function changeWeightReps(patch: Partial<Pick<WeightRepsValues, 'weightKg' | 'reps'>>) {
    onChange((current) => (current.type === 'weight_reps' ? { ...current, ...patch } : current))
  }

  return (
    <>
      <NumberField
        label={`第 ${setNumber} 組重量（kg）`}
        inputMode="decimal"
        value={values.weightKg}
        onChange={(weightKg) => changeWeightReps({ weightKg })}
      />
      <span className="text-sm text-muted-foreground">kg ×</span>
      <NumberField
        label={`第 ${setNumber} 組次數`}
        inputMode="numeric"
        value={values.reps}
        onChange={(reps) => changeWeightReps({ reps })}
      />
    </>
  )
}
