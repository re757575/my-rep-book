import { useId } from 'react'
import { formatDuration, summarizeWorkout, type Workout } from '@/domain'

const volumeFormat = new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 2 })

function SummaryItem({ label, value }: { label: string; value: string }) {
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

/**
 * 每日摘要：動作數、正式組數、總訓練量與有氧總時間。數值為 0 的項目照樣顯示 0。
 * 訓練頁頂部與歷史的日明細共用。總訓練量目前一律以 kg 顯示。
 */
export function DailySummary({ workout }: { workout: Workout }) {
  const summary = summarizeWorkout(workout)
  return (
    <section aria-label="每日摘要" className="rounded-lg bg-muted px-2 py-3">
      <dl className="grid grid-cols-4 gap-2">
        <SummaryItem label="動作數" value={String(summary.exerciseCount)} />
        <SummaryItem label="正式組數" value={String(summary.workingSetCount)} />
        <SummaryItem label="總訓練量" value={`${volumeFormat.format(summary.volumeKg)} kg`} />
        <SummaryItem label="有氧總時間" value={formatDuration(summary.cardioDurationSec)} />
      </dl>
    </section>
  )
}
