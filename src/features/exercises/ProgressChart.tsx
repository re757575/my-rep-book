import { useId, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  buildProgressSeries,
  formatDateWithYear,
  formatProgressValue,
  fromLocalDate,
  niceTicks,
  PROGRESS_METRICS,
  type ExerciseSessionProgress,
  type LocalDate,
  type ProgressMetric,
  type ProgressPoint,
} from '@/domain'
import { useWeightUnit } from '@/features/settings/settingsContext'

const METRIC_LABELS: Readonly<Record<ProgressMetric, string>> = {
  maxWeight: '最大重量',
  oneRepMax: '估算 1RM',
  volume: '訓練量',
}

/** 訓練次數不超過這個數時每一次都畫點，更多時只畫最新一次與選取的點 */
const MAX_DOTS = 24

// 圖的座標（viewBox）：整張圖等比例縮放到容器寬度
const WIDTH = 340
const HEIGHT = 180
const MARGIN = { top: 12, right: 12, bottom: 24, left: 48 }
const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom
const DAY_MS = 24 * 60 * 60 * 1000

function dayNumber(date: LocalDate) {
  return Math.round(fromLocalDate(date).getTime() / DAY_MS)
}

/** 圖上橫軸兩端的日期：同一年用 `M/D`，跨年用 `YYYY/M/D` */
function axisDate(date: LocalDate, withYear: boolean) {
  const [year, month, day] = date.split('-').map(Number)
  return withYear ? `${year}/${month}/${day}` : `${month}/${day}`
}

function formatTick(value: number) {
  return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

interface Geometry {
  xs: number[]
  ys: number[]
  ticks: { value: number; y: number }[]
}

/** 點與刻度在圖上的位置：橫軸依實際的日期間隔排列，縱軸取乾淨的刻度 */
function layout(points: readonly ProgressPoint[]): Geometry {
  const days = points.map((point) => dayNumber(point.date))
  const first = days[0]
  const span = Math.max(days.at(-1)! - first, 1)
  const values = points.map((point) => point.value)
  const { ticks, min, max } = niceTicks(Math.min(...values), Math.max(...values))
  const yOf = (value: number) => MARGIN.top + PLOT_HEIGHT * (1 - (value - min) / (max - min))
  return {
    xs: days.map((day) => MARGIN.left + (PLOT_WIDTH * (day - first)) / span),
    ys: values.map(yOf),
    ticks: ticks.map((value) => ({ value, y: yOf(value) })),
  }
}

function nearestIndex(xs: readonly number[], x: number) {
  return xs.reduce(
    (best, candidate, index) => (Math.abs(candidate - x) < Math.abs(xs[best] - x) ? index : best),
    0,
  )
}

/**
 * 動作的進度圖表（US-34）：最大重量、估算 1RM、訓練量隨日期的折線圖，一次一個指標。
 * 選取的那一次（預設最新）的數值與日期寫在圖上方，不用靠滑過才讀得到；
 * 點擊、滑過或用左右鍵可以選別次。少於 2 次訓練連不成線，不顯示。
 */
export function ProgressChart({ sessions }: { sessions: readonly ExerciseSessionProgress[] }) {
  const titleId = useId()
  const weightUnit = useWeightUnit()
  const [metric, setMetric] = useState<ProgressMetric>('maxWeight')
  const [selected, setSelected] = useState<number>()

  const points = buildProgressSeries(sessions, metric, weightUnit)
  if (points.length < 2) return null

  const { xs, ys, ticks } = layout(points)
  const activeIndex = Math.min(selected ?? points.length - 1, points.length - 1)
  const active = points[activeIndex]
  const withYear = points[0].date.slice(0, 4) !== points.at(-1)!.date.slice(0, 4)
  const showAllDots = points.length <= MAX_DOTS
  const unitLabel = weightUnit

  function selectAt(event: PointerEvent<SVGRectElement>) {
    const svg = event.currentTarget.ownerSVGElement
    if (!svg) return
    const box = svg.getBoundingClientRect()
    setSelected(nearestIndex(xs, ((event.clientX - box.left) * WIDTH) / box.width))
  }

  function moveWithKeys(event: KeyboardEvent<HTMLDivElement>) {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key]
    if (step !== undefined) {
      event.preventDefault()
      setSelected(Math.min(Math.max(activeIndex + step, 0), points.length - 1))
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      setSelected(event.key === 'Home' ? 0 : points.length - 1)
    }
  }

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <h2 id={titleId} className="font-semibold">
        進度
      </h2>
      <ToggleGroup
        type="single"
        variant="outline"
        aria-label="進度指標"
        value={metric}
        // 再按一次已選的指標時 Radix 會給空字串，維持原本的選擇
        onValueChange={(next) => next && setMetric(next as ProgressMetric)}
        className="self-start"
      >
        {PROGRESS_METRICS.map((option) => (
          <ToggleGroupItem key={option} value={option} className="h-11 min-w-11 px-3">
            {METRIC_LABELS[option]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {/* 選取的那一次：數值在前、日期在後 */}
      <p role="status" className="flex items-baseline gap-2">
        <span className="text-lg font-semibold">
          {`${formatProgressValue(metric, active.kg, weightUnit)} ${unitLabel}`}
        </span>
        <span className="text-sm text-muted-foreground">{formatDateWithYear(active.date)}</span>
      </p>

      <div
        role="group"
        aria-label={`${METRIC_LABELS[metric]}（${unitLabel}）折線圖，共 ${points.length} 次訓練，用左右鍵選擇`}
        tabIndex={0}
        onKeyDown={moveWithKeys}
        className="rounded-md text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          aria-hidden="true"
          // 垂直捲動照常，水平移動用來選取
          style={{ touchAction: 'pan-y' }}
          className="block h-auto w-full"
        >
          {ticks.map(({ value, y }) => (
            <g key={value}>
              <line
                x1={MARGIN.left}
                x2={WIDTH - MARGIN.right}
                y1={y}
                y2={y}
                className="stroke-border"
                strokeWidth={1}
              />
              <text
                x={MARGIN.left - 6}
                y={y}
                textAnchor="end"
                dominantBaseline="central"
                className="fill-muted-foreground text-[11px] tabular-nums"
              >
                {formatTick(value)}
              </text>
            </g>
          ))}
          <text
            x={xs[0]}
            y={HEIGHT - 6}
            textAnchor="start"
            className="fill-muted-foreground text-[11px]"
          >
            {axisDate(points[0].date, withYear)}
          </text>
          <text
            x={xs.at(-1)}
            y={HEIGHT - 6}
            textAnchor="end"
            className="fill-muted-foreground text-[11px]"
          >
            {axisDate(points.at(-1)!.date, withYear)}
          </text>

          <line
            x1={xs[activeIndex]}
            x2={xs[activeIndex]}
            y1={MARGIN.top}
            y2={MARGIN.top + PLOT_HEIGHT}
            className="stroke-muted-foreground"
            strokeWidth={1}
          />
          <polyline
            points={xs.map((x, i) => `${x},${ys[i]}`).join(' ')}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.map((point, i) =>
            showAllDots || i === points.length - 1 || i === activeIndex ? (
              <circle
                key={point.date}
                cx={xs[i]}
                cy={ys[i]}
                r={i === activeIndex ? 5 : 4}
                fill="currentColor"
                // 2px 的底色外圈，點疊在線上或彼此靠近時仍分得開
                className="stroke-background"
                strokeWidth={2}
              />
            ) : null,
          )}
          {/* 整個繪圖區都是點選的範圍，不必精準點到某個點 */}
          <rect
            x={MARGIN.left}
            y={MARGIN.top}
            width={PLOT_WIDTH}
            height={PLOT_HEIGHT}
            fill="transparent"
            onPointerDown={selectAt}
            onPointerMove={selectAt}
          />
        </svg>
      </div>

      {/* 圖的文字替代：給螢幕閱讀器的表格，每一次訓練一列 */}
      <table className="sr-only">
        <caption>{`${METRIC_LABELS[metric]}（${unitLabel}）`}</caption>
        <thead>
          <tr>
            <th scope="col">日期</th>
            <th scope="col">{METRIC_LABELS[metric]}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.date}>
              <th scope="row">{formatDateWithYear(point.date)}</th>
              <td>{`${formatProgressValue(metric, point.kg, weightUnit)} ${unitLabel}`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
