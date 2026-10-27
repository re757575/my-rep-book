import { useId, useState } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useLiveData } from '@/data'
import {
  BROWSE_CATEGORIES,
  BROWSE_CATEGORY_LABELS,
  formatDateTitle,
  formatWeight,
  periodRange,
  summarizePeriod,
  type LocalDate,
  type PeriodStats,
  type StatsPeriod,
} from '@/domain'
import { useLibraryExercises } from '@/features/exercises/useLibraryExercises'
import { useWeightUnit } from '@/features/settings/settingsContext'
import { today } from '@/features/workout/dayPath'

const PERIOD_LABELS: Readonly<Record<StatsPeriod, string>> = { week: '週', month: '月' }

/** 區間的顯示：本週、`10/12（一）– 10/18（日）`、`2026年10月` */
function rangeTitle(period: StatsPeriod, [from, to]: [LocalDate, LocalDate]) {
  if (period === 'month') return `${from.slice(0, 4)}年${Number(from.slice(5, 7))}月`
  if (from <= today() && today() <= to) return '本週'
  return `${formatDateTitle(from)} – ${formatDateTitle(to)}`
}

function StatItem({ label, value }: { label: string; value: string }) {
  const id = useId()
  return (
    <div className="flex flex-col items-center gap-0.5">
      <dt id={id} className="text-xs text-muted-foreground">
        {label}
      </dt>
      <dd aria-labelledby={id} className="font-semibold tabular-nums">
        {value}
      </dd>
    </div>
  )
}

/** 各分類的組數：10 大類全部列出（0 組也列，看得出哪裡練太少），長條依最多組數的分類等比例 */
function CategorySets({ setsByCategory }: { setsByCategory: PeriodStats['setsByCategory'] }) {
  const max = Math.max(1, ...Object.values(setsByCategory))
  return (
    <ul aria-label="各部位組數" className="flex flex-col gap-1">
      {BROWSE_CATEGORIES.map((category) => {
        const count = setsByCategory[category]
        return (
          <li
            key={category}
            className="grid grid-cols-[7.5rem_1fr_3rem] items-center gap-2 text-sm"
          >
            <span>{BROWSE_CATEGORY_LABELS[category]}</span>
            <span aria-hidden="true" className="h-2 rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${(count / max) * 100}%` }}
              />
            </span>
            <span className="text-right tabular-nums">{count} 組</span>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * 歷史頁的每週／每月統計：訓練天數、正式組數、總訓練量與各部位的組數。
 * 週為選取日期所在的一週，月跟著月曆目前顯示的月份。
 */
export function PeriodStatsSection({
  month,
  selected,
}: {
  /** 月曆目前顯示的月份（該月第一天） */
  month: LocalDate
  /** 選取的日期 */
  selected: LocalDate
}) {
  const headingId = useId()
  const [period, setPeriod] = useState<StatsPeriod>('week')
  const range = periodRange(period, period === 'month' ? month : selected)
  const [from, to] = range
  const workouts = useLiveData(
    (repositories) => repositories.workouts.listInRange(from, to),
    [from, to],
  )
  const library = useLibraryExercises()
  const weightUnit = useWeightUnit()

  const stats =
    workouts && library
      ? summarizePeriod(workouts, new Map(library.map((exercise) => [exercise.id, exercise])))
      : undefined

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id={headingId} className="font-semibold">
          統計
        </h2>
        <ToggleGroup
          type="single"
          variant="outline"
          aria-label="統計區間"
          value={period}
          // 再按一次已選的區間時 Radix 會給空字串，維持原本的選擇
          onValueChange={(next) => next && setPeriod(next as StatsPeriod)}
        >
          {(['week', 'month'] as const).map((option) => (
            <ToggleGroupItem key={option} value={option} className="h-11 min-w-11 px-3">
              {PERIOD_LABELS[option]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <p className="text-sm text-muted-foreground">{rangeTitle(period, range)}</p>
      {stats && (
        <>
          <dl className="grid grid-cols-3 gap-2 rounded-lg bg-muted px-2 py-3">
            <StatItem label="訓練天數" value={`${stats.trainingDays} 天`} />
            <StatItem label="正式組數" value={String(stats.workingSetCount)} />
            <StatItem
              label="總訓練量"
              value={`${formatWeight(stats.volumeKg, weightUnit, { grouping: true })} ${weightUnit}`}
            />
          </dl>
          {stats.trainingDays === 0 ? (
            <p className="py-2 text-center text-muted-foreground">這段期間沒有訓練</p>
          ) : (
            <CategorySets setsByCategory={stats.setsByCategory} />
          )}
        </>
      )}
    </section>
  )
}
