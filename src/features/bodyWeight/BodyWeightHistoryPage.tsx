import { ChevronLeft } from 'lucide-react'
import { Link } from 'react-router'
import { useLiveData } from '@/data'
import { formatDateWithYear, formatWeight, type BodyWeightEntry } from '@/domain'
import { useWeightUnit } from '@/features/settings/settingsContext'
import { dayPath } from '@/features/workout/dayPath'
import { Bmi } from './Bmi'

function BodyWeightRow({ entry }: { entry: BodyWeightEntry }) {
  const weightUnit = useWeightUnit()
  return (
    <li className="flex items-center gap-4 py-1">
      {/* 點日期前往該日的訓練頁修改體重 */}
      <Link
        to={dayPath(entry.date)}
        className="flex min-h-11 items-center font-medium underline-offset-4 hover:underline"
      >
        {formatDateWithYear(entry.date)}
      </Link>
      <span className="ml-auto tabular-nums">
        {formatWeight(entry.weightKg, weightUnit)} {weightUnit}
      </span>
      <Bmi weightKg={entry.weightKg} className="w-20 text-right" />
    </li>
  )
}

/** 體重紀錄：所有體重由新到舊，以目前的重量單位顯示；有身高時每筆附上 BMI */
export function BodyWeightHistoryPage() {
  const entries = useLiveData((repositories) => repositories.bodyWeights.listAll(), [])

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/history"
        className="-ml-2 flex min-h-11 w-max items-center gap-1 pr-2 text-sm text-muted-foreground"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        返回歷史
      </Link>
      <h1 className="text-xl font-semibold">體重紀錄</h1>
      {entries &&
        (entries.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground">
            還沒有體重紀錄，可以在訓練頁輸入當天的體重
          </p>
        ) : (
          <ol aria-label="體重紀錄" className="divide-y">
            {entries.map((entry) => (
              <BodyWeightRow key={entry.date} entry={entry} />
            ))}
          </ol>
        ))}
    </div>
  )
}
