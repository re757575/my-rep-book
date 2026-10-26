import { ChevronLeft } from 'lucide-react'
import { Link } from 'react-router'
import { useLiveData } from '@/data'
import {
  buildBodyWeightTrend,
  formatDateWithYear,
  formatRoundedWeight,
  formatWeight,
  formatWeightChange,
  type BodyWeightTrendEntry,
  type WeightUnit,
} from '@/domain'
import { useWeightUnit } from '@/features/settings/settingsContext'
import { dayPath, UNLOCKED } from '@/features/workout/dayPath'
import { Bmi } from './Bmi'

/** 7 日平均與比上週增減，例如 `7 日平均 72.3 kg · 比上週 -0.4 kg` */
function trendText(entry: BodyWeightTrendEntry, weightUnit: WeightUnit) {
  const average = `7 日平均 ${formatRoundedWeight(entry.averageKg, weightUnit)} ${weightUnit}`
  if (entry.changeFromLastWeekKg === null) return average
  const change = formatWeightChange(entry.changeFromLastWeekKg, weightUnit)
  return `${average} · 比上週 ${change} ${weightUnit}`
}

function BodyWeightRow({ entry }: { entry: BodyWeightTrendEntry }) {
  const weightUnit = useWeightUnit()
  return (
    <li className="flex flex-col pb-2">
      <div className="flex items-center gap-4">
        {/* 點日期前往該日的訓練頁修改體重，一進入就解鎖 */}
        <Link
          to={dayPath(entry.date)}
          state={UNLOCKED}
          className="flex min-h-11 items-center font-medium underline-offset-4 hover:underline"
        >
          {formatDateWithYear(entry.date)}
        </Link>
        <span className="ml-auto tabular-nums">
          {formatWeight(entry.weightKg, weightUnit)} {weightUnit}
        </span>
        <Bmi weightKg={entry.weightKg} className="w-20 text-right" />
      </div>
      <p className="text-sm text-muted-foreground tabular-nums">{trendText(entry, weightUnit)}</p>
    </li>
  )
}

/**
 * 體重紀錄：所有體重由新到舊，以目前的重量單位顯示；有身高時每筆附上 BMI。
 * 每筆下方顯示 7 日平均與比上週增減
 */
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
            {buildBodyWeightTrend(entries).map((entry) => (
              <BodyWeightRow key={entry.date} entry={entry} />
            ))}
          </ol>
        ))}
    </div>
  )
}
