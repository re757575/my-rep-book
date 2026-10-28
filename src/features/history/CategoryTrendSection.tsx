import { useId, useState } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useLiveData } from '@/data'
import {
  BROWSE_CATEGORY_LABELS,
  TREND_WEEKS,
  addDays,
  averageOfCompletedWeeks,
  buildCategoryTrend,
  formatDateTitle,
  trendRange,
  type CategoryFilter,
  type TrendWeeks,
  type WeeklySetPoint,
} from '@/domain'
import { LineChart } from '@/features/charts/LineChart'
import { CategoryFilterBar } from '@/features/exercises/CategoryFilterBar'
import { useLibraryExercises } from '@/features/exercises/useLibraryExercises'
import { today } from '@/features/workout/dayPath'

const WEEKS_LABELS: Readonly<Record<TrendWeeks, string>> = {
  12: '12 週',
  26: '26 週',
  52: '52 週',
}

/** 週數不超過這個數時每一週都畫點，更多時只畫最新一週與選取的那一週 */
const MAX_DOTS = 26

/** 一週的期間：`10/12（一）– 10/18（日）` */
function weekTitle(weekStart: string) {
  return `${formatDateTitle(weekStart)} – ${formatDateTitle(addDays(weekStart, 6))}`
}

function categoryLabel(category: CategoryFilter) {
  return category === 'all' ? '全部' : BROWSE_CATEGORY_LABELS[category]
}

/**
 * 歷史頁的組數趨勢（US-47）：所選部位（或全部）每一週的正式組數，看長期哪裡練太少或太多。
 * 一律以今天為準，最後一週是還沒結束的本週；選取的那一週（預設本週）的組數與期間寫在圖上方。
 */
export function CategoryTrendSection() {
  const titleId = useId()
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [weeks, setWeeks] = useState<TrendWeeks>(12)
  const [selected, setSelected] = useState<number>()
  const [from, to] = trendRange(weeks, today())
  const workouts = useLiveData(
    (repositories) => repositories.workouts.listInRange(from, to),
    [from, to],
  )
  const library = useLibraryExercises()

  const points =
    workouts && library
      ? buildCategoryTrend(
          workouts,
          new Map(library.map((exercise) => [exercise.id, exercise])),
          category,
          weeks,
          today(),
        )
      : undefined

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <h2 id={titleId} className="font-semibold">
        組數趨勢
      </h2>
      <CategoryFilterBar value={category} onChange={setCategory} />
      <ToggleGroup
        type="single"
        variant="outline"
        aria-label="趨勢區間"
        value={String(weeks)}
        onValueChange={(next) => {
          if (!next) return
          setWeeks(Number(next) as TrendWeeks)
          setSelected(undefined)
        }}
        className="self-start"
      >
        {TREND_WEEKS.map((option) => (
          <ToggleGroupItem key={option} value={String(option)} className="h-11 min-w-11 px-3">
            {WEEKS_LABELS[option]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {points && (
        <TrendChart
          points={points}
          category={category}
          selected={selected}
          onSelect={setSelected}
        />
      )}
    </section>
  )
}

function TrendChart({
  points,
  category,
  selected,
  onSelect,
}: {
  points: WeeklySetPoint[]
  category: CategoryFilter
  selected: number | undefined
  onSelect: (index: number) => void
}) {
  if (points.every((point) => point.sets === 0)) {
    return (
      <p className="py-4 text-center text-muted-foreground">
        {category === 'all' ? '這段期間沒有訓練' : `這段期間沒有${categoryLabel(category)}的訓練`}
      </p>
    )
  }

  const last = points.length - 1
  const activeIndex = Math.min(selected ?? last, last)
  const active = points[activeIndex]
  const average = averageOfCompletedWeeks(points)

  return (
    <>
      {/* 選取的那一週：組數在前、期間在後；本週還沒結束 */}
      <p role="status" className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-lg font-semibold">{`${active.sets} 組`}</span>
        <span className="text-sm text-muted-foreground">{weekTitle(active.weekStart)}</span>
        {activeIndex === last && (
          <span className="text-sm text-muted-foreground">本週（還沒結束）</span>
        )}
      </p>

      <LineChart
        dates={points.map((point) => point.weekStart)}
        series={[
          {
            id: 'sets',
            tone: 'primary',
            values: points.map((point) => point.sets),
            allDots: points.length <= MAX_DOTS,
          },
        ]}
        activeIndex={activeIndex}
        onActiveIndexChange={onSelect}
        includeZero
        ariaLabel={`${categoryLabel(category)}每週組數折線圖，共 ${points.length} 週，用左右鍵選擇`}
      />

      {average !== undefined && (
        <p className="text-sm text-muted-foreground">
          {`平均每週 ${average.toFixed(1)} 組（不含本週）`}
        </p>
      )}

      {/* 圖的文字替代：給螢幕閱讀器的表格，每一週一列 */}
      <table className="sr-only">
        <caption>{`${categoryLabel(category)}每週組數`}</caption>
        <thead>
          <tr>
            <th scope="col">週</th>
            <th scope="col">組數</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.weekStart}>
              <th scope="row">{weekTitle(point.weekStart)}</th>
              <td>{`${point.sets} 組`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
