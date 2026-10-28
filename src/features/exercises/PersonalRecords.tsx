import { useId } from 'react'
import { useLiveData } from '@/data'
import {
  buildExerciseRecords,
  formatDateWithYear,
  formatRoundedWeight,
  formatWeightReps,
  type ExerciseRecords,
  type ExerciseSessionProgress,
  type LocalDate,
  type TrackingType,
} from '@/domain'
import { useWeightUnit } from '@/features/settings/settingsContext'
import { ExerciseHistory } from './ExerciseHistory'
import { ProgressChart } from './ProgressChart'

/** 一張卡片：標籤、數值，以及各占一行的說明（一行內不換行，窄螢幕也不會把日期拆開，US-46） */
function RecordItem({
  label,
  value,
  details,
}: {
  label: string
  value: string
  details: string[]
}) {
  const id = useId()
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-muted px-3 py-2">
      <dt id={id} className="text-xs text-muted-foreground">
        {label}
      </dt>
      <dd aria-labelledby={id} className="flex flex-col gap-0.5">
        <span className="text-lg font-semibold tabular-nums">{value}</span>
        {details.map((detail) => (
          <span key={detail} className="text-xs whitespace-nowrap text-muted-foreground">
            {detail}
          </span>
        ))}
      </dd>
    </div>
  )
}

/** 個人紀錄：最大重量與估算 1RM，各自附上第一次達到的日子（估算 1RM 另外一行是算出它的那一組） */
function PersonalRecords({ records }: { records: ExerciseRecords }) {
  const headingId = useId()
  const weightUnit = useWeightUnit()
  const { maxWeight, oneRepMax } = records
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="font-semibold">
        個人紀錄
      </h2>
      <dl className="grid grid-cols-2 gap-2">
        <RecordItem
          label="最大重量"
          value={formatWeightReps(maxWeight.set, weightUnit)}
          details={[formatDateWithYear(maxWeight.date)]}
        />
        <RecordItem
          label="估算 1RM"
          value={`${formatRoundedWeight(oneRepMax.estimatedKg, weightUnit)} ${weightUnit}`}
          details={[
            formatWeightReps(oneRepMax.set, weightUnit),
            formatDateWithYear(oneRepMax.date),
          ]}
        />
      </dl>
      <p className="text-xs text-muted-foreground">
        只計正式組；估算 1RM 以 Epley 公式：重量 ×（1 + 次數 ÷ 30）
      </p>
    </section>
  )
}

/**
 * 重量×次數的動作：先顯示個人紀錄與進度圖表，再在每一筆歷史紀錄加上當次的進度。
 * 個人紀錄與「是否破紀錄」要看過全部的紀錄才算得出來，所以讀取這個動作的所有訓練。
 */
function WeightRepsRecordsAndHistory({ exerciseId }: { exerciseId: string }) {
  const records = useLiveData(
    async (repositories) =>
      buildExerciseRecords(await repositories.workouts.listByExercise(exerciseId), exerciseId) ??
      null,
    [exerciseId],
  )
  // 等紀錄算好再一起顯示，避免歷史紀錄先出現、進度晚一步插入造成跳動
  if (records === undefined) return null
  const progress = new Map<LocalDate, ExerciseSessionProgress>(
    records?.sessions.map((session) => [session.date, session]),
  )
  return (
    <>
      {records && <PersonalRecords records={records} />}
      {records && <ProgressChart sessions={records.sessions} />}
      <ExerciseHistory exerciseId={exerciseId} progress={progress} />
    </>
  )
}

/** 動作詳情頁下半部：重量×次數的動作加上個人紀錄與每次的進度，其他記錄類型只有歷史紀錄 */
export function ExerciseRecordsAndHistory({
  exerciseId,
  trackingType,
}: {
  exerciseId: string
  trackingType: TrackingType
}) {
  return trackingType === 'weight_reps' ? (
    <WeightRepsRecordsAndHistory exerciseId={exerciseId} />
  ) : (
    <ExerciseHistory exerciseId={exerciseId} />
  )
}
