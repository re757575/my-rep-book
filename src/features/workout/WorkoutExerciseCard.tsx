import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  formatLastPerformance,
  formatSetValues,
  formatWorkoutExerciseSummary,
  pairSetsWithLast,
  SET_TYPE_LABELS,
  SET_TYPE_SHORT_LABELS,
  type LastPerformance,
  type SetField,
  type SetRecordKind,
  type SetType,
  type SetValues,
  type WeightUnit,
  type WorkoutExercise,
} from '@/domain'
import { EffortPicker } from '@/features/effort/EffortPicker'
import { useEffortSettings } from '@/features/effort/effortStore'
import { RecordBadge } from '@/features/exercises/RecordBadge'
import { useWeightUnit } from '@/features/settings/settingsContext'
import { cn } from '@/lib/utils'
import { SetFields } from './SetFields'
import { useCollapsedWorkoutExercise } from './useCollapsedWorkoutExercise'
import { useWorkoutReadOnly } from './workoutReadOnly'

/**
 * 訓練動作：動作名稱、上次紀錄、各組的類型按鈕與輸入欄位，以及「新增一組」。
 * `actions` 顯示在動作名稱旁（排序、刪除動作），`children` 顯示在最下方（備註）。
 * 點動作名稱可以收合：收合後只留名稱、操作與這個動作的總計（`formatWorkoutExerciseSummary`）。
 * 破了紀錄的組在欄位下方標示「重量新紀錄」「1RM 新紀錄」（US-31）。
 * 訓練頁鎖定時各組只能看：類型按鈕停用，刪除組與新增一組不顯示。
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
  onCycleSetType,
  onSetRpe,
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
  /** 把這一組換成下一個組類型（US-37） */
  onCycleSetType: (setId: string) => void
  /** 設定這一組的強度（RPE）；`undefined` 是取消（US-39） */
  onSetRpe: (setId: string, rpe: number | undefined) => void
  onDeleteSet: (setId: string) => void
}) {
  const headingId = useId()
  const bodyId = useId()
  const weightUnit = useWeightUnit()
  const [collapsed, setCollapsed] = useCollapsedWorkoutExercise(workoutExercise.id)
  const readOnly = useWorkoutReadOnly()
  const effort = useEffortSettings()
  const lastSets = pairSetsWithLast(workoutExercise.sets, lastPerformance)

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
                'flex flex-col gap-1 rounded-md',
                set.setType === 'warmup' && 'bg-muted text-muted-foreground',
              )}
            >
              <div className="flex items-start gap-2">
                <span className="flex h-11 w-6 shrink-0 items-center justify-center text-sm text-muted-foreground">
                  {index + 1}
                </span>
                {/* 按一下換成下一個類型：正式 → 熱身 → 遞減 → 力竭，標熱身仍然只要一下 */}
                <Button
                  variant={set.setType === 'regular' ? 'outline' : 'default'}
                  className="size-11 shrink-0"
                  aria-label={`第 ${index + 1} 組類型：${SET_TYPE_LABELS[set.setType]}`}
                  disabled={readOnly}
                  onClick={() => onCycleSetType(set.id)}
                >
                  {SET_TYPE_SHORT_LABELS[set.setType]}
                </Button>
                <div className="flex min-w-0 flex-col gap-1">
                  <SetFields
                    values={set.values}
                    setNumber={index + 1}
                    onChange={(field, value) => onChangeSetField(set.id, field, value)}
                  />
                  <SetHints
                    setType={set.setType}
                    last={lastSets.get(set.id)}
                    records={setRecords.get(set.id)}
                    weightUnit={weightUnit}
                  />
                </div>
                {!readOnly && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto size-11 shrink-0 text-muted-foreground"
                    aria-label={`刪除第 ${index + 1} 組`}
                    onClick={() => onDeleteSet(set.id)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                )}
              </div>
              {/* 強度：只有正式組（不是熱身）、開啟強度記錄時才有；鎖定時只在已經記了強度時顯示。
                  左邊空出序號與類型按鈕的寬度（24 + 8 + 44 + 8 px），按鈕才排得下 */}
              {effort.enabled &&
                set.setType !== 'warmup' &&
                (!readOnly || set.rpe !== undefined) && (
                  <div className="pb-1 pl-[5.25rem]">
                    <EffortPicker
                      setNumber={index + 1}
                      rpe={set.rpe}
                      scale={effort.scale}
                      disabled={readOnly}
                      onChange={(rpe) => onSetRpe(set.id, rpe)}
                    />
                  </div>
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

/** 組的欄位下方：上次同一組的數值（淡色），以及破了哪些紀錄 */
function SetHints({
  setType,
  last,
  records,
  weightUnit,
}: {
  setType: SetType
  last: SetValues | undefined
  records: readonly SetRecordKind[] | undefined
  weightUnit: WeightUnit
}) {
  // 熱身整列已經淡色、正式是預設，所以只有遞減與力竭在這裡加標籤
  const typeLabel =
    setType === 'drop' || setType === 'failure' ? SET_TYPE_LABELS[setType] : undefined
  if (!last && !records && !typeLabel) return null
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {typeLabel && (
        <span className="rounded-sm bg-muted px-1.5 text-xs text-muted-foreground">
          {typeLabel}
        </span>
      )}
      {last && (
        <p className="text-xs text-muted-foreground tabular-nums">
          {`上次 ${formatSetValues(last, weightUnit)}`}
        </p>
      )}
      {records?.map((kind) => (
        <RecordBadge key={kind}>{RECORD_LABELS[kind]}</RecordBadge>
      ))}
    </div>
  )
}
