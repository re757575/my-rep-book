import type { KeyboardEvent, PointerEvent } from 'react'
import { fromLocalDate, niceTicks, type LocalDate } from '@/domain'

/** 圖上的一條線：`values` 與 `dates` 一一對應，單位相同（共用同一個 Y 軸） */
export interface LineSeries {
  id: string
  /** `primary` 是主題前景色、較突出；`muted` 是淡色，當背景脈絡 */
  tone: 'primary' | 'muted'
  values: readonly number[]
  /** 每一個點都畫點；否則只畫最新一個與選取的那個 */
  allDots: boolean
}

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

function nearestIndex(xs: readonly number[], x: number) {
  return xs.reduce(
    (best, candidate, index) => (Math.abs(candidate - x) < Math.abs(xs[best] - x) ? index : best),
    0,
  )
}

const TONE_CLASS = { primary: 'text-primary', muted: 'text-muted-foreground' } as const

/**
 * 折線圖：橫軸是日期（依實際的日期間隔排列），縱軸是數值（取乾淨的刻度，不一定從 0 開始）。
 * 點擊、滑過圖上任一處選取最近的一個點；聚焦後用左右鍵、Home、End 移動。
 * 選取的點（`activeIndex`）畫垂直線與加大的點。數值的讀數、圖例與給螢幕閱讀器的表格由使用端提供，
 * 這裡只管圖本身。至少要有 2 個點。
 */
export function LineChart({
  dates,
  series,
  activeIndex,
  onActiveIndexChange,
  ariaLabel,
  includeZero = false,
}: {
  dates: readonly LocalDate[]
  series: readonly LineSeries[]
  activeIndex: number
  onActiveIndexChange: (index: number) => void
  ariaLabel: string
  /** Y 軸一定包含 0（例如組數這類計數，從 0 開始才不會誇大差距）；預設只涵蓋資料的範圍 */
  includeZero?: boolean
}) {
  const days = dates.map(dayNumber)
  const span = Math.max(days.at(-1)! - days[0], 1)
  const allValues = series.flatMap((line) => line.values)
  const { ticks, min, max } = niceTicks(
    includeZero ? Math.min(0, ...allValues) : Math.min(...allValues),
    Math.max(...allValues),
  )
  const yOf = (value: number) => MARGIN.top + PLOT_HEIGHT * (1 - (value - min) / (max - min))
  const xs = days.map((day) => MARGIN.left + (PLOT_WIDTH * (day - days[0])) / span)
  const withYear = dates[0].slice(0, 4) !== dates.at(-1)!.slice(0, 4)
  const last = dates.length - 1

  function selectAt(event: PointerEvent<SVGRectElement>) {
    const svg = event.currentTarget.ownerSVGElement
    if (!svg) return
    const box = svg.getBoundingClientRect()
    onActiveIndexChange(nearestIndex(xs, ((event.clientX - box.left) * WIDTH) / box.width))
  }

  function moveWithKeys(event: KeyboardEvent<HTMLDivElement>) {
    const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key]
    if (step !== undefined) {
      event.preventDefault()
      onActiveIndexChange(Math.min(Math.max(activeIndex + step, 0), last))
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      onActiveIndexChange(event.key === 'Home' ? 0 : last)
    }
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={moveWithKeys}
      className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        aria-hidden="true"
        // 垂直捲動照常，水平移動用來選取
        style={{ touchAction: 'pan-y' }}
        className="block h-auto w-full"
      >
        {ticks.map((value) => (
          <g key={value}>
            <line
              x1={MARGIN.left}
              x2={WIDTH - MARGIN.right}
              y1={yOf(value)}
              y2={yOf(value)}
              className="stroke-border"
              strokeWidth={1}
            />
            <text
              x={MARGIN.left - 6}
              y={yOf(value)}
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
          {axisDate(dates[0], withYear)}
        </text>
        <text
          x={xs[last]}
          y={HEIGHT - 6}
          textAnchor="end"
          className="fill-muted-foreground text-[11px]"
        >
          {axisDate(dates[last], withYear)}
        </text>

        <line
          x1={xs[activeIndex]}
          x2={xs[activeIndex]}
          y1={MARGIN.top}
          y2={MARGIN.top + PLOT_HEIGHT}
          className="stroke-muted-foreground"
          strokeWidth={1}
        />
        {/* 淡色的線先畫，突出的線蓋在上面 */}
        {[...series]
          .sort((a, b) => Number(b.tone === 'muted') - Number(a.tone === 'muted'))
          .map((line) => (
            <g key={line.id} className={TONE_CLASS[line.tone]}>
              <polyline
                points={xs.map((x, i) => `${x},${yOf(line.values[i])}`).join(' ')}
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {dates.map((date, i) =>
                line.allDots || i === last || i === activeIndex ? (
                  <circle
                    key={date}
                    cx={xs[i]}
                    cy={yOf(line.values[i])}
                    r={i === activeIndex ? 5 : 4}
                    fill="currentColor"
                    // 2px 的底色外圈，點疊在線上或彼此靠近時仍分得開
                    className="stroke-background"
                    strokeWidth={2}
                  />
                ) : null,
              )}
            </g>
          ))}
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
  )
}
