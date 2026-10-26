import { useId, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { useLiveData } from '@/data'
import {
  buildExerciseHistory,
  formatDateWithYear,
  formatRoundedWeight,
  formatWeight,
  formatWeightReps,
  type ExerciseHistoryEntry,
  type ExerciseSessionProgress,
  type LocalDate,
} from '@/domain'
import { useWeightUnit } from '@/features/settings/settingsContext'
import { dayPath } from '@/features/workout/dayPath'
import { WorkoutSetList } from '@/features/workout/WorkoutSetList'

/** 首批與每次「載入更多」的筆數 */
const HISTORY_PAGE_SIZE = 20

function RecordBadge({ children }: { children: string }) {
  return (
    <span className="rounded-sm bg-primary px-1.5 text-xs text-primary-foreground">{children}</span>
  )
}

/** 當次的進度：最重的一組、估算 1RM、訓練量，破紀錄時加上標記 */
function SessionProgress({ progress }: { progress: ExerciseSessionProgress }) {
  const weightUnit = useWeightUnit()
  const topSet = formatWeightReps(progress.topSet, weightUnit)
  const oneRepMax = formatRoundedWeight(progress.estimatedOneRepMaxKg, weightUnit)
  const volume = formatWeight(progress.volumeKg, weightUnit, { grouping: true })
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <p className="text-sm text-muted-foreground tabular-nums">
        {`最重 ${topSet} · 估算 1RM ${oneRepMax} ${weightUnit} · 訓練量 ${volume} ${weightUnit}`}
      </p>
      {progress.isMaxWeightRecord && <RecordBadge>重量新紀錄</RecordBadge>}
      {progress.isOneRepMaxRecord && <RecordBadge>1RM 新紀錄</RecordBadge>}
    </div>
  )
}

function HistoryEntry({
  entry,
  progress,
}: {
  entry: ExerciseHistoryEntry
  progress: ExerciseSessionProgress | undefined
}) {
  const dateId = useId()

  return (
    <article aria-labelledby={dateId} className="flex flex-col gap-1 py-3">
      <Link
        id={dateId}
        to={dayPath(entry.date)}
        className="flex min-h-11 w-max items-center font-medium underline-offset-4 hover:underline"
      >
        {formatDateWithYear(entry.date)}
      </Link>
      {progress && <SessionProgress progress={progress} />}
      <WorkoutSetList sets={entry.sets} />
      {entry.notes.map((note, index) => (
        <p key={index} className="text-sm whitespace-pre-wrap text-muted-foreground">
          {note}
        </p>
      ))}
    </article>
  )
}

/**
 * 動作詳情頁的動作歷史：這個動作的每一次紀錄，由新到舊，分批載入。
 * `progress` 為各日期當次的進度（重量×次數的動作才有），有的話顯示在日期下方。
 */
export function ExerciseHistory({
  exerciseId,
  progress,
}: {
  exerciseId: string
  progress?: ReadonlyMap<LocalDate, ExerciseSessionProgress>
}) {
  const headingId = useId()
  const [limit, setLimit] = useState(HISTORY_PAGE_SIZE)
  // 多取一筆，用來判斷還有沒有更多
  const workouts = useLiveData(
    (repositories) => repositories.workouts.listByExercise(exerciseId, { limit: limit + 1 }),
    [exerciseId, limit],
  )

  if (workouts === undefined) return null

  const entries = buildExerciseHistory(workouts.slice(0, limit), exerciseId)
  const hasMore = workouts.length > limit

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="font-semibold">
        歷史紀錄
      </h2>
      {entries.length === 0 ? (
        <p className="py-4 text-center text-muted-foreground">還沒有紀錄</p>
      ) : (
        <ol aria-label="歷史紀錄" className="divide-y">
          {entries.map((entry) => (
            <li key={entry.date}>
              <HistoryEntry entry={entry} progress={progress?.get(entry.date)} />
            </li>
          ))}
        </ol>
      )}
      {hasMore && (
        <Button
          variant="outline"
          className="h-11"
          onClick={() => setLimit((current) => current + HISTORY_PAGE_SIZE)}
        >
          載入更多
        </Button>
      )}
    </section>
  )
}
