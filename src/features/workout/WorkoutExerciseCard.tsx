import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'
import {
  formatLastPerformance,
  formatWorkoutExerciseSummary,
  type LastPerformance,
  type SetField,
  type SetRecordKind,
  type WorkoutExercise,
} from '@/domain'
import { RecordBadge } from '@/features/exercises/RecordBadge'
import { useWeightUnit } from '@/features/settings/settingsContext'
import { cn } from '@/lib/utils'
import { SetFields } from './SetFields'
import { useCollapsedWorkoutExercise } from './useCollapsedWorkoutExercise'
import { useWorkoutReadOnly } from './workoutReadOnly'

/**
 * 訓練動作：動作名稱、上次紀錄、各組的熱身標記與輸入欄位，以及「新增一組」。
 * `actions` 顯示在動作名稱旁（排序、刪除動作），`children` 顯示在最下方（備註）。
 * 點動作名稱可以收合：收合後只留名稱、操作與這個動作的總計（`formatWorkoutExerciseSummary`）。
 * 破了紀錄的組在欄位下方標示「重量新紀錄」「1RM 新紀錄」（US-31）。
 * 訓練頁鎖定時各組只能看：熱身標記停用，刪除組與新增一組不顯示。
 */
export function WorkoutExerciseCard({
  workoutExercise,
  exerciseName,
  lastPerformance,
  setRecords,
  actions,
  children,
  onAddSet,
  onChangeSetField,
  onToggleWarmup,
  onDeleteSet,
}: {
  workoutExercise: WorkoutExercise
  exerciseName: string
  /** 沒有上次紀錄時不顯示「上次」那一列 */
  lastPerformance: LastPerformance | undefined
  /** 破了紀錄的組（key 是組的 ID），標示在那一組旁；沒有時傳空的 Map */
  setRecords: ReadonlyMap<string, readonly SetRecordKind[]>
  actions?: ReactNode
  children?: ReactNode
  onAddSet: () => void
  onChangeSetField: (setId: string, field: SetField, value: number | null) => void
  onToggleWarmup: (setId: string) => void
  onDeleteSet: (setId: string) => void
}) {
  const headingId = useId()
  const bodyId = useId()
  const weightUnit = useWeightUnit()
  const [collapsed, setCollapsed] = useCollapsedWorkoutExercise(workoutExercise.id)
  const readOnly = useWorkoutReadOnly()

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2 border-b pb-4">
      <header className="flex items-center gap-2">
        <h2 id={headingId} className="flex-1 font-semibold">
          {/* 整個名稱都是收合按鈕，單手也好按 */}
          <button
            type="button"
            aria-expanded={!collapsed}
            aria-controls={bodyId}
            onClick={() => setCollapsed(!collapsed)}
            className="flex min-h-11 w-full items-center gap-1 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ChevronDown
              aria-hidden="true"
              className={cn('size-4 shrink-0 transition-transform', collapsed && '-rotate-90')}
            />
            {exerciseName}
          </button>
        </h2>
        {actions}
      </header>
      {collapsed && (
        <p className="text-sm text-muted-foreground tabular-nums">
          {formatWorkoutExerciseSummary(workoutExercise.sets, weightUnit)}
        </p>
      )}
      {/* 收合時保持掛載、只隱藏，輸入到一半的文字不會遺失 */}
      <div id={bodyId} hidden={collapsed} className={collapsed ? 'hidden' : 'flex flex-col gap-2'}>
        {lastPerformance && (
          <p className="text-sm text-muted-foreground">
            {formatLastPerformance(lastPerformance, weightUnit)}
          </p>
        )}
        <ol className="flex flex-col gap-2">
          {workoutExercise.sets.map((set, index) => (
            <li
              key={set.id}
              className={cn(
                'flex items-start gap-2 rounded-md',
                set.isWarmup && 'bg-muted text-muted-foreground',
              )}
            >
              <span className="flex h-11 w-6 items-center justify-center text-sm text-muted-foreground">
                {index + 1}
              </span>
              <Toggle
                variant="outline"
                className="size-11 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                aria-label={`第 ${index + 1} 組熱身`}
                pressed={set.isWarmup}
                disabled={readOnly}
                onPressedChange={() => onToggleWarmup(set.id)}
              >
                熱
              </Toggle>
              <div className="flex flex-col gap-1">
                <SetFields
                  values={set.values}
                  setNumber={index + 1}
                  onChange={(field, value) => onChangeSetField(set.id, field, value)}
                />
                <SetRecordBadges kinds={setRecords.get(set.id)} />
              </div>
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-auto size-11 text-muted-foreground"
                  aria-label={`刪除第 ${index + 1} 組`}
                  onClick={() => onDeleteSet(set.id)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              )}
            </li>
          ))}
        </ol>
        {!readOnly && (
          <Button variant="ghost" className="h-11" onClick={onAddSet}>
            <Plus aria-hidden="true" />
            新增一組
          </Button>
        )}
        {children}
      </div>
    </section>
  )
}

const RECORD_LABELS: Readonly<Record<SetRecordKind, string>> = {
  maxWeight: '重量新紀錄',
  oneRepMax: '1RM 新紀錄',
}

function SetRecordBadges({ kinds }: { kinds: readonly SetRecordKind[] | undefined }) {
  if (!kinds) return null
  return (
    <div className="flex flex-wrap gap-1">
      {kinds.map((kind) => (
        <RecordBadge key={kind}>{RECORD_LABELS[kind]}</RecordBadge>
      ))}
    </div>
  )
}
