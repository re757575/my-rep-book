import { useId, useState } from 'react'
import { Input } from '@/components/ui/input'
import { useLiveData, useRepositories } from '@/data'
import {
  formatWeight,
  parseBodyWeightInput,
  type BodyWeightEntry,
  type LocalDate,
  type WeightUnit,
} from '@/domain'
import { useWeightUnit } from '@/features/settings/settingsContext'
import { Bmi } from './Bmi'

/**
 * 訓練頁上當天的體重：每次輸入就自動儲存，沒有儲存按鈕；清空即刪除當天的體重。
 * 不合法時在欄位下方顯示錯誤且不寫入。以目前的重量單位輸入與顯示，有身高時在旁邊顯示 BMI。
 */
export function BodyWeightField({ date }: { date: LocalDate }) {
  const entry = useLiveData(
    async (repositories) => (await repositories.bodyWeights.getByDate(date)) ?? null,
    [date],
  )
  const weightUnit = useWeightUnit()

  // 載入完才知道欄位的初始值；先保留同樣的高度，避免下方內容跳動
  if (entry === undefined) return <div className="h-11" />
  return (
    <section aria-label="體重" className="flex items-start gap-2">
      {/* 切換單位時欄位重新掛載，以新的單位顯示 */}
      <BodyWeightInput key={weightUnit} date={date} entry={entry} weightUnit={weightUnit} />
      {entry && <Bmi weightKg={entry.weightKg} className="mt-3 ml-auto" />}
    </section>
  )
}

function BodyWeightInput({
  date,
  entry,
  weightUnit,
}: {
  date: LocalDate
  entry: BodyWeightEntry | null
  weightUnit: WeightUnit
}) {
  const { bodyWeights } = useRepositories()
  const inputId = useId()
  const errorId = useId()
  // 畫面上的文字由欄位自己保存，避免輸入到一半（例如「72.」）被儲存後的數值蓋掉
  const [text, setText] = useState(() => (entry ? formatWeight(entry.weightKg, weightUnit) : ''))
  const [error, setError] = useState<string>()

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <label htmlFor={inputId} className="font-medium">
          體重
        </label>
        <Input
          id={inputId}
          type="text"
          inputMode="decimal"
          aria-label={`體重（${weightUnit}）`}
          aria-invalid={error !== undefined}
          aria-describedby={error ? errorId : undefined}
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            const parsed = parseBodyWeightInput(event.target.value, weightUnit)
            setError(parsed.ok ? undefined : parsed.error)
            if (parsed.ok) bodyWeights.edit(date, parsed.value)
          }}
          className="h-11 w-24 text-center"
        />
        <span className="text-sm text-muted-foreground">{weightUnit}</span>
      </div>
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
