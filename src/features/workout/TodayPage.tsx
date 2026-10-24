import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useLiveData, useRepositories } from '@/data'
import {
  addExerciseToWorkout,
  addSetToWorkoutExercise,
  updateSetValues,
  type EditContext,
  type LocalDate,
  type Workout,
} from '@/domain'
import { useLibraryExercises } from '@/features/exercises/useLibraryExercises'
import { AddExerciseDialog } from './AddExerciseDialog'
import { WorkoutDateHeader } from './WorkoutDateHeader'
import { WorkoutExerciseCard } from './WorkoutExerciseCard'

function editContext(): EditContext {
  return { now: new Date().toISOString(), createId: () => crypto.randomUUID() }
}

export function TodayPage({ date }: { date: LocalDate }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const { workouts } = useRepositories()
  const workout = useLiveData(
    async (repositories) => (await repositories.workouts.getByDate(date)) ?? null,
    [date],
  )
  const library = useLibraryExercises()
  const exercisesById = new Map(library?.map((exercise) => [exercise.id, exercise]))

  /** 編輯已存在的訓練：在 repository 的 transaction 中以最新資料套用變更 */
  function editWorkout(change: (current: Workout) => Workout) {
    return workouts.update(date, (current) => {
      if (!current) throw new Error(`找不到 ${date} 的訓練`)
      return change(current)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <WorkoutDateHeader date={date} />

      {/* 動作庫載入後才顯示，避免動作名稱閃爍 */}
      {library &&
        workout?.exercises.map((workoutExercise) => {
          const exercise = exercisesById.get(workoutExercise.exerciseId)
          return (
            <WorkoutExerciseCard
              key={workoutExercise.id}
              workoutExercise={workoutExercise}
              exerciseName={exercise?.nameZh ?? workoutExercise.exerciseId}
              onAddSet={() =>
                exercise &&
                editWorkout((current) =>
                  addSetToWorkoutExercise(
                    current,
                    workoutExercise.id,
                    exercise.trackingType,
                    editContext(),
                  ),
                )
              }
              onChangeSet={(setId, change) =>
                editWorkout((current) =>
                  updateSetValues(current, workoutExercise.id, setId, change, editContext().now),
                )
              }
            />
          )
        })}

      <Button variant="outline" className="h-11" onClick={() => setPickerOpen(true)}>
        <Plus aria-hidden="true" />
        加入動作
      </Button>
      <AddExerciseDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={(exercise) =>
          workouts.update(date, (current) =>
            addExerciseToWorkout(current, date, exercise, editContext()),
          )
        }
      />
    </div>
  )
}
