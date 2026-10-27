import { Plus } from 'lucide-react'
import { lazy, startTransition, useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { useLiveData, useRepositories } from '@/data'
import {
  addExerciseToWorkout,
  addSetToWorkoutExercise,
  completesSet,
  findNewRecordSets,
  moveWorkoutExercise,
  setSetRpe,
  cycleSetType,
  type EditContext,
  type LastPerformance,
  type LocalDate,
  type Workout,
} from '@/domain'
import { startRestTimerIfEnabled } from '@/features/restTimer/restTimerStore'
import { BodyWeightField } from '@/features/bodyWeight/BodyWeightField'
import { useLibraryExercises } from '@/features/exercises/useLibraryExercises'
import { whenIdleAfterLoad } from '@/lib/whenIdleAfterLoad'
import { CollapseAllButton } from './CollapseAllButton'
import { DailySummary } from './DailySummary'
import { today, type DayRouteState } from './dayPath'
import { deleteSetWithUndo, deleteWorkoutExerciseWithUndo } from './deleteWithUndo'
import { ExerciseNoteField } from './ExerciseNoteField'
import { queryLastPerformance } from './queryLastPerformance'
import { useRecordBaselines } from './useRecordBaselines'
import { WorkoutDateHeader } from './WorkoutDateHeader'
import { WorkoutExerciseActions } from './WorkoutExerciseActions'
import { WorkoutExerciseCard } from './WorkoutExerciseCard'
import { WorkoutLockSwitch } from './WorkoutLockSwitch'
import { WorkoutReadOnlyContext } from './workoutReadOnly'

// 加入動作選單帶著 Dialog、分類篩選與動作清單，不放進首次載入的 JS（PRD §7）。
// 頁面載入後趁閒置先載入，第一次打開時就不用等下載
const loadAddExerciseDialog = () => import('./AddExerciseDialog')
const AddExerciseDialog = lazy(async () => ({
  default: (await loadAddExerciseDialog()).AddExerciseDialog,
}))

function editContext(): EditContext {
  return { now: new Date().toISOString(), createId: () => crypto.randomUUID() }
}

export function TodayPage({ date }: { date: LocalDate }) {
  const location = useLocation()
  // 非今天的紀錄預設鎖定，避免翻看過去時誤改；從「編輯」進入時一開始就解鎖。
  // 不記住：換日期時頁面重新掛載，回到預設
  const [locked, setLocked] = useState(
    () => date !== today() && !(location.state as DayRouteState | null)?.unlocked,
  )
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerLoaded, setPickerLoaded] = useState(false)
  useEffect(() => whenIdleAfterLoad(() => void loadAddExerciseDialog()), [])
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

  // 重量×次數的動作才有新紀錄；動作庫載入後才知道記錄類型
  const weightRepsIds = [
    ...new Set(
      workout?.exercises
        .filter((item) => exercisesById.get(item.exerciseId)?.trackingType === 'weight_reps')
        .map((item) => item.exerciseId),
    ),
  ]
  const recordBaselines = useRecordBaselines(workouts, date, weightRepsIds)

  /** 編輯已存在的訓練：在 repository 的 transaction 中以最新資料套用變更 */
  function editWorkout(change: (current: Workout) => Workout) {
    return workouts.update(date, (current) => {
      if (!current) throw new Error(`找不到 ${date} 的訓練`)
      return change(current)
    })
  }

  /** 組間休息只在記錄今天的訓練時自動開始；補記過去的日期時不會 */
  function startRestIfToday() {
    if (date === today() && !locked) startRestTimerIfEnabled()
  }

  return (
    <WorkoutReadOnlyContext value={locked}>
      <div className="flex flex-col gap-4">
        <WorkoutDateHeader date={date} />
        <WorkoutLockSwitch locked={locked} onLockedChange={setLocked} />
        <BodyWeightField date={date} />
        {workout && <DailySummary workout={workout} />}
        {workout && (
          <CollapseAllButton workoutExerciseIds={workout.exercises.map((item) => item.id)} />
        )}

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
                setRecords={findNewRecordSets(
                  recordBaselines.get(workoutExercise.exerciseId),
                  workout,
                  workoutExercise.exerciseId,
                )}
                actions={
                  !locked && (
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
                        deleteWorkoutExerciseWithUndo(
                          workouts,
                          date,
                          workoutExercise.id,
                          exerciseName,
                        )
                      }
                    />
                  )
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
                  startRestIfToday()
                }}
                onSetRpe={(setId, rpe) =>
                  editWorkout((current) =>
                    setSetRpe(current, workoutExercise.id, setId, rpe, editContext().now),
                  )
                }
                onCycleSetType={(setId) =>
                  editWorkout((current) =>
                    cycleSetType(current, workoutExercise.id, setId, editContext().now),
                  )
                }
                onChangeSetField={(setId, field, value) => {
                  const set = workoutExercise.sets.find((item) => item.id === setId)
                  if (set && completesSet(set.values, field, value)) startRestIfToday()
                  return workouts.editField({
                    kind: 'setValue',
                    date,
                    workoutExerciseId: workoutExercise.id,
                    setId,
                    field,
                    value,
                  })
                }}
                onDeleteSet={(setId) =>
                  deleteSetWithUndo(workouts, date, workoutExercise.id, setId)
                }
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

        {!locked && (
          <Button
            variant="outline"
            className="h-11"
            onClick={() =>
              // 用 transition 等選單載入完成再一次打開，不經過 Suspense 的 fallback（React 會把 fallback
              // 換成內容的時機延後約 300 ms，第一次打開就會慢半拍）
              startTransition(() => {
                setPickerLoaded(true)
                setPickerOpen(true)
              })
            }
          >
            <Plus aria-hidden="true" />
            加入動作
          </Button>
        )}
        {/* 第一次打開才載入；之後保持掛載，關閉時才有動畫 */}
        {pickerLoaded && (
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
        )}
      </div>
    </WorkoutReadOnlyContext>
  )
}
