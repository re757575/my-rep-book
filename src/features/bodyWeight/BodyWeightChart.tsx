import { useId, useState } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  BODY_WEIGHT_CHART_RANGES,
  buildBodyWeightChart,
  formatDateWithYear,
  formatRoundedWeight,
  formatWeight,
  kgToLb,
  type BodyWeightChartRange,
  type BodyWeightEntry,
} from '@/domain'
import { LineChart } from '@/features/charts/LineChart'
import { useWeightUnit } from '@/features/settings/settingsContext'
import { today } from '@/features/workout/dayPath'

const RANGE_LABELS: Readonly<Record<BodyWeightChartRange, string>> = {
  '30d': '30 天',
  '90d': '90 天',
  '1y': '1 年',
  all: '全部',
}

/** 體重筆數不超過這個數時每一筆都畫點，更多時只畫最新一筆與選取的那一筆 */
const MAX_DOTS = 24

/** 圖例：一小段線樣加名稱，樣式與圖上的線一致 */
function LegendItem({ label, className }: { label: string; className: string }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden="true" className={`h-0.5 w-5 rounded-full ${className}`} />
      {label}
    </li>
  )
}

/**
 * 體重趨勢圖（US-36）：每日體重（淡色）與 7 日平均（突出）兩條線，共用一個軸。
 * 區間可切換，選取的那一筆（預設最新）的體重與平均寫在圖上方。
 * 區間內少於 2 筆畫不出線，改顯示提示。
 */
export function BodyWeightChart({ entries }: { entries: readonly BodyWeightEntry[] }) {
  const titleId = useId()
  const weightUnit = useWeightUnit()
  const [range, setRange] = useState<BodyWeightChartRange>('90d')
  const [selected, setSelected] = useState<number>()

  const points = buildBodyWeightChart(entries, range, today())
  const inUnit = (kg: number) => (weightUnit === 'lb' ? kgToLb(kg) : kg)
  const activeIndex = Math.min(selected ?? points.length - 1, points.length - 1)
  const active = points[activeIndex]

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <h2 id={titleId} className="font-semibold">
        體重趨勢
      </h2>
      <ToggleGroup
        type="single"
        variant="outline"
        aria-label="趨勢區間"
        value={range}
        // 再按一次已選的區間時 Radix 會給空字串，維持原本的選擇
        onValueChange={(next) => next && setRange(next as BodyWeightChartRange)}
        className="self-start"
      >
        {BODY_WEIGHT_CHART_RANGES.map((option) => (
          <ToggleGroupItem key={option} value={option} className="h-11 min-w-11 px-3">
            {RANGE_LABELS[option]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {points.length < 2 ? (
        <p className="py-4 text-center text-muted-foreground">這段期間少於 2 筆體重</p>
      ) : (
        <>
          {/* 選取的那一筆：數值在前、日期與平均在後 */}
          <p role="status" className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-lg font-semibold">
              {`${formatWeight(active.weightKg, weightUnit)} ${weightUnit}`}
            </span>
            <span className="text-sm text-muted-foreground">{formatDateWithYear(active.date)}</span>
            <span className="text-sm text-muted-foreground">
              {`7 日平均 ${formatRoundedWeight(active.averageKg, weightUnit)} ${weightUnit}`}
            </span>
          </p>

          <LineChart
            dates={points.map((point) => point.date)}
            series={[
              {
                id: 'daily',
                tone: 'muted',
                values: points.map((point) => inUnit(point.weightKg)),
                allDots: points.length <= MAX_DOTS,
              },
              {
                id: 'average',
                tone: 'primary',
                values: points.map((point) => inUnit(point.averageKg)),
                allDots: false,
              },
            ]}
            activeIndex={activeIndex}
            onActiveIndexChange={setSelected}
            ariaLabel={`體重（${weightUnit}）與 7 日平均折線圖，共 ${points.length} 筆，用左右鍵選擇`}
          />

          <ul
            aria-label="圖例"
            className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground"
          >
            <LegendItem label="每日體重" className="bg-muted-foreground" />
            <LegendItem label="7 日平均" className="bg-primary" />
          </ul>

          {/* 圖的文字替代：給螢幕閱讀器的表格，每一筆體重一列 */}
          <table className="sr-only">
            <caption>{`體重（${weightUnit}）與 7 日平均`}</caption>
            <thead>
              <tr>
                <th scope="col">日期</th>
                <th scope="col">體重</th>
                <th scope="col">7 日平均</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.date}>
                  <th scope="row">{formatDateWithYear(point.date)}</th>
                  <td>{`${formatWeight(point.weightKg, weightUnit)} ${weightUnit}`}</td>
                  <td>{`${formatRoundedWeight(point.averageKg, weightUnit)} ${weightUnit}`}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  )
}
