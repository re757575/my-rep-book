import { ChevronDown } from 'lucide-react'
import { useId, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { useLiveData } from '@/data'
import {
  buildExerciseHistory,
  formatDateWithYear,
  formatWorkoutExerciseSummary,
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
import { cn } from '@/lib/utils'
import { RecordBadge } from './RecordBadge'

/** 首批與每次「載入更多」的筆數 */
const HISTORY_PAGE_SIZE = 20

/** 預設展開最近幾筆，更早的收合（US-38） */
const EXPANDED_BY_DEFAULT = 3

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

/**
 * 動作歷史中的一筆。左邊的按鈕展開或收合各組與備註，收合時只留日期列與當次的摘要：
 * 重量×次數的動作是當次的進度，其他記錄類型是這一次的總計（同訓練動作收合後的總計）。
 * 日期仍然是前往該日訓練頁的連結。展開狀態只是畫面狀態，`defaultExpanded` 之後由使用者決定。
 */
function HistoryEntry({
  entry,
  progress,
  defaultExpanded,
}: {
  entry: ExerciseHistoryEntry
  progress: ExerciseSessionProgress | undefined
  defaultExpanded: boolean
}) {
  const dateId = useId()
  const bodyId = useId()
  const weightUnit = useWeightUnit()
  const [expanded, setExpanded] = useState(defaultExpanded)
  const date = formatDateWithYear(entry.date)

  return (
    <article aria-labelledby={dateId} className="flex flex-col gap-1 py-3">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="-ml-3 size-11 text-muted-foreground"
          aria-label={`${date} 的各組與備註`}
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronDown
            aria-hidden="true"
            className={cn('size-4 transition-transform', !expanded && '-rotate-90')}
          />
        </Button>
        <Link
          id={dateId}
          to={dayPath(entry.date)}
          className="flex min-h-11 w-max items-center font-medium underline-offset-4 hover:underline"
        >
          {date}
        </Link>
      </div>
      {progress ? (
        <SessionProgress progress={progress} />
      ) : (
        !expanded && (
          <p className="text-sm text-muted-foreground tabular-nums">
            {formatWorkoutExerciseSummary(entry.sets, weightUnit)}
          </p>
        )
      )}
      {/* 收合時只隱藏，不卸載 */}
      <div id={bodyId} hidden={!expanded} className="flex flex-col gap-1">
        <WorkoutSetList sets={entry.sets} />
        {entry.notes.map((note, index) => (
          <p key={index} className="text-sm whitespace-pre-wrap text-muted-foreground">
            {note}
          </p>
        ))}
      </div>
    </article>
  )
}

/**
 * 動作詳情頁的動作歷史：這個動作的每一次紀錄，由新到舊，分批載入；最近 3 筆展開，更早的收合（US-38）。
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
          {entries.map((entry, index) => (
            <li key={entry.date}>
              <HistoryEntry
                entry={entry}
                progress={progress?.get(entry.date)}
                defaultExpanded={index < EXPANDED_BY_DEFAULT}
              />
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
