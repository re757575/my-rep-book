import { useId } from 'react'
import { useLiveData } from '@/data'
import { buildTrainingRhythm } from '@/domain'
import { today } from '@/features/workout/dayPath'

function RhythmItem({ label, value }: { label: string; value: string }) {
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
 * 歷史頁最上方的訓練節奏（US-45）：本週已練幾天、目前連續幾週有訓練、最長連續幾週。
 * 一律以今天為準，不隨選取的日期或月曆的月份改變。
 */
export function TrainingRhythmSection() {
  const headingId = useId()
  // 全部有訓練的日期（日期是主鍵的索引，只讀鍵，資料量小）；晚於今天的日期不會出現
  const dates = useLiveData(
    (repositories) => repositories.workouts.listDatesInRange('0000-01-01', today()),
    [],
  )
  if (!dates) return null
  const rhythm = buildTrainingRhythm(dates, today())

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="font-semibold">
        訓練節奏
      </h2>
      <dl className="grid grid-cols-3 gap-2 rounded-lg bg-muted px-2 py-3">
        <RhythmItem label="本週已練" value={`${rhythm.daysThisWeek} 天`} />
        <RhythmItem label="連續" value={`${rhythm.currentStreakWeeks} 週`} />
        <RhythmItem label="最長連續" value={`${rhythm.longestStreakWeeks} 週`} />
      </dl>
      {rhythm.daysThisWeek === 0 && rhythm.currentStreakWeeks > 0 && (
        <p className="text-sm text-muted-foreground">
          本週還沒練，練一天就能延續連續 {rhythm.currentStreakWeeks} 週
        </p>
      )}
    </section>
  )
}
