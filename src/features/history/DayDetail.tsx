import { Pencil } from 'lucide-react'
import { useId } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { useLiveData } from '@/data'
import { formatDateTitle, type LocalDate, type WorkoutExercise } from '@/domain'
import { BodyWeightSummary } from '@/features/bodyWeight/BodyWeightSummary'
import { useLibraryExercises } from '@/features/exercises/useLibraryExercises'
import { DailySummary } from '@/features/workout/DailySummary'
import { dayPath } from '@/features/workout/dayPath'
import { WorkoutSetList } from '@/features/workout/WorkoutSetList'

function DayDetailExercise({
  workoutExercise,
  name,
}: {
  workoutExercise: WorkoutExercise
  name: string
}) {
  const headingId = useId()
  return (
    <article aria-labelledby={headingId} className="flex flex-col gap-1 py-3">
      <h3 id={headingId} className="font-medium">
        {name}
      </h3>
      <WorkoutSetList sets={workoutExercise.sets} />
      {workoutExercise.note.trim() !== '' && (
        <p className="text-sm whitespace-pre-wrap text-muted-foreground">{workoutExercise.note}</p>
      )}
    </article>
  )
}

/** 歷史的日明細：當天的體重、每日摘要、每個動作的每一組與備註 */
export function DayDetail({ date }: { date: LocalDate }) {
  const headingId = useId()
  const workout = useLiveData(
    async (repositories) => (await repositories.workouts.getByDate(date)) ?? null,
    [date],
  )
  const bodyWeight = useLiveData(
    async (repositories) => (await repositories.bodyWeights.getByDate(date)) ?? null,
    [date],
  )
  // 名稱從全部動作（含已隱藏、已封存）查，封存後的動作照樣顯示名稱
  const library = useLibraryExercises()

  if (workout === undefined || bodyWeight === undefined || library === undefined) return null
  const namesById = new Map(library.map((exercise) => [exercise.id, exercise.nameZh]))

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id={headingId} className="font-semibold">
          {formatDateTitle(date)}
        </h2>
        {(workout || bodyWeight) && (
          <Button asChild variant="outline" className="h-11">
            <Link to={dayPath(date)}>
              <Pencil aria-hidden="true" />
              編輯
            </Link>
          </Button>
        )}
      </div>
      {bodyWeight && <BodyWeightSummary entry={bodyWeight} />}
      {workout === null ? (
        <p className="py-4 text-center text-muted-foreground">這天沒有訓練</p>
      ) : (
        <>
          <DailySummary workout={workout} />
          <div className="divide-y">
            {workout.exercises.map((workoutExercise) => (
              <DayDetailExercise
                key={workoutExercise.id}
                workoutExercise={workoutExercise}
                name={namesById.get(workoutExercise.exerciseId) ?? workoutExercise.exerciseId}
              />
            ))}
          </div>
        </>
      )}
    </section>
  )
}
