import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useLiveData, useRepositories } from '@/data'
import {
  addExerciseToWorkout,
  addSetToWorkoutExercise,
  moveWorkoutExercise,
  toggleSetWarmup,
  type EditContext,
  type LastPerformance,
  type LocalDate,
  type Workout,
} from '@/domain'
import { useLibraryExercises } from '@/features/exercises/useLibraryExercises'
import { AddExerciseDialog } from './AddExerciseDialog'
import { deleteSetWithUndo, deleteWorkoutExerciseWithUndo } from './deleteWithUndo'
import { ExerciseNoteField } from './ExerciseNoteField'
import { queryLastPerformance } from './queryLastPerformance'
import { WorkoutDateHeader } from './WorkoutDateHeader'
import { WorkoutExerciseActions } from './WorkoutExerciseActions'
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

  // 每個動作在這一天之前的上次紀錄；更早的訓練被修改時自動更新
  const exerciseIdsKey = JSON.stringify([
    ...new Set(workout?.exercises.map((item) => item.exerciseId)),
  ])
  const lastPerformances = useLiveData(
    async (repositories) => {
      const exerciseIds = JSON.parse(exerciseIdsKey) as string[]
      const entries = await Promise.all(
        exerciseIds.map(
          async (exerciseId) =>
            [
              exerciseId,
              await queryLastPerformance(repositories.workouts, exerciseId, date),
            ] as const,
        ),
      )
      return new Map<string, LastPerformance | undefined>(entries)
    },
    [date, exerciseIdsKey],
  )

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
        workout?.exercises.map((workoutExercise, index, all) => {
          const exercise = exercisesById.get(workoutExercise.exerciseId)
          const exerciseName = exercise?.nameZh ?? workoutExercise.exerciseId
          return (
            <WorkoutExerciseCard
              key={workoutExercise.id}
              workoutExercise={workoutExercise}
              exerciseName={exerciseName}
              lastPerformance={lastPerformances?.get(workoutExercise.exerciseId)}
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
              onAddSet={async () => {
                if (!exercise) return
                // 沒有任何組時要依上次紀錄預填；查詢很快，每次都以最新的上次紀錄為準
                const lastPerformance = await queryLastPerformance(workouts, exercise.id, date)
                await editWorkout((current) =>
                  addSetToWorkoutExercise(
                    current,
                    workoutExercise.id,
                    exercise.trackingType,
                    lastPerformance,
                    editContext(),
                  ),
                )
              }}
              onToggleWarmup={(setId) =>
                editWorkout((current) =>
                  toggleSetWarmup(current, workoutExercise.id, setId, editContext().now),
                )
              }
              onChangeSetField={(setId, field, value) =>
                workouts.editField({
                  kind: 'setValue',
                  date,
                  workoutExerciseId: workoutExercise.id,
                  setId,
                  field,
                  value,
                })
              }
              onDeleteSet={(setId) => deleteSetWithUndo(workouts, date, workoutExercise.id, setId)}
            >
              <ExerciseNoteField
                note={workoutExercise.note}
                onChange={(note) =>
                  workouts.editField({
                    kind: 'note',
                    date,
                    workoutExerciseId: workoutExercise.id,
                    note,
                  })
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
        onSelect={async (exercise) => {
          const lastPerformance = await queryLastPerformance(workouts, exercise.id, date)
          await workouts.update(date, (current) =>
            addExerciseToWorkout(current, date, exercise, lastPerformance, editContext()),
          )
        }}
      />
    </div>
  )
}
