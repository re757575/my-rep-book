import { useId, useState } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  buildProgressSeries,
  formatDateWithYear,
  formatProgressValue,
  PROGRESS_METRICS,
  type ExerciseSessionProgress,
  type ProgressMetric,
} from '@/domain'
import { LineChart } from '@/features/charts/LineChart'
import { useWeightUnit } from '@/features/settings/settingsContext'

const METRIC_LABELS: Readonly<Record<ProgressMetric, string>> = {
  maxWeight: '最大重量',
  oneRepMax: '估算 1RM',
  volume: '訓練量',
}

/** 訓練次數不超過這個數時每一次都畫點，更多時只畫最新一次與選取的點 */
const MAX_DOTS = 24

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

  const activeIndex = Math.min(selected ?? points.length - 1, points.length - 1)
  const active = points[activeIndex]
  const unitLabel = weightUnit

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

      <LineChart
        dates={points.map((point) => point.date)}
        series={[
          {
            id: metric,
            tone: 'primary',
            values: points.map((point) => point.value),
            allDots: points.length <= MAX_DOTS,
          },
        ]}
        activeIndex={activeIndex}
        onActiveIndexChange={setSelected}
        ariaLabel={`${METRIC_LABELS[metric]}（${unitLabel}）折線圖，共 ${points.length} 次訓練，用左右鍵選擇`}
      />

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
