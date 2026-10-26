import { formatWeight, type BodyWeightEntry } from '@/domain'
import { useWeightUnit } from '@/features/settings/settingsContext'
import { Bmi } from './Bmi'

/** 歷史的日明細中當天的體重，以目前的重量單位顯示；有身高時一併顯示 BMI */
export function BodyWeightSummary({ entry }: { entry: BodyWeightEntry }) {
  const weightUnit = useWeightUnit()
  return (
    <div className="flex items-baseline justify-between gap-2">
      <p className="tabular-nums">
        體重 {formatWeight(entry.weightKg, weightUnit)} {weightUnit}
      </p>
      <Bmi weightKg={entry.weightKg} />
    </div>
  )
}
