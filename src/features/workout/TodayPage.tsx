import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useLiveData, useRepositories } from '@/data'
import {
  addExerciseToWorkout,
  addSetToWorkoutExercise,
  formatDateTitle,
  moveWorkoutExercise,
  toLocalDate,
  updateSetValues,
  updateWorkoutExerciseNote,
  type EditContext,
  type Workout,
} from '@/domain'
import { useLibraryExercises } from '@/features/exercises/useLibraryExercises'
import { AddExerciseDialog } from './AddExerciseDialog'
import { deleteSetWithUndo, deleteWorkoutExerciseWithUndo } from './deleteWithUndo'
import { ExerciseNoteField } from './ExerciseNoteField'
import { WorkoutExerciseActions } from './WorkoutExerciseActions'
import { WorkoutExerciseCard } from './WorkoutExerciseCard'

function editContext(): EditContext {
  return { now: new Date().toISOString(), createId: () => crypto.randomUUID() }
}

export function TodayPage() {
  const date = toLocalDate(new Date())
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
      <header className="flex items-baseline gap-2">
        <h1 className="text-xl font-semibold">{formatDateTitle(date)}</h1>
        <span className="text-sm text-muted-foreground">今天</span>
      </header>

      {/* 動作庫載入後才顯示，避免動作名稱閃爍 */}
      {library &&
        workout?.exercises.map((workoutExercise, index, all) => {
          const exercise = exercisesById.get(workoutExercise.exerciseId)
          const exerciseName = exercise?.nameZh ?? workoutExercise.exerciseId
          return (
            <WorkoutExerciseCard
              key={workoutExercise.id}
              workoutExercise={workoutExercise}
              exerciseName={exerciseName}
              actions={
                <WorkoutExerciseActions
                  isFirst={index === 0}
                  isLast={index === all.length - 1}
                  onMove={(direction) =>
                    editWorkout((current) =>
                      moveWorkoutExercise(
                        current,
                        workoutExercise.id,
                        direction,
                        editContext().now,
                      ),
                    )
                  }
                  onDelete={() =>
                    deleteWorkoutExerciseWithUndo(workouts, date, workoutExercise.id, exerciseName)
                  }
                />
              }
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
              onDeleteSet={(setId) => deleteSetWithUndo(workouts, date, workoutExercise.id, setId)}
            >
              <ExerciseNoteField
                note={workoutExercise.note}
                onChange={(note) =>
                  editWorkout((current) =>
                    updateWorkoutExerciseNote(current, workoutExercise.id, note, editContext().now),
                  )
                }
              />
            </WorkoutExerciseCard>
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
