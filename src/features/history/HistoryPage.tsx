import { Scale, Sparkles } from 'lucide-react'
import { useState, type ComponentProps } from 'react'
import { labelDayButton, type DayButtonProps } from 'react-day-picker'
import { zhTW } from 'react-day-picker/locale'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Calendar, CalendarDayButton } from '@/components/ui/calendar'
import { useLiveData } from '@/data'
import {
  addDays,
  dayLevel,
  fromLocalDate,
  toLocalDate,
  type DayLevel,
  type LocalDate,
} from '@/domain'
import { today } from '@/features/workout/dayPath'
import { CategoryTrendSection } from './CategoryTrendSection'
import { DayDetail } from './DayDetail'
import { DayLevelDot } from './DayLevelDot'
import { DAY_LEVEL_DESCRIPTIONS, DAY_LEVEL_LEGEND } from './dayLevelText'
import { PeriodStatsSection } from './PeriodStatsSection'
import { TrainingRhythmSection } from './TrainingRhythmSection'

type CalendarProps = ComponentProps<typeof Calendar>

/** 月份第一天，例如 2026-10-24 → 2026-10-01 */
function monthStartOf(date: LocalDate): LocalDate {
  return `${date.slice(0, 7)}-01`
}

/**
 * 月曆畫面上可能出現的日期區間（含前後月份的日期）：
 * 一個月最多 31 天、前面最多補 6 天，整個月曆不超過 6 週（42 天）
 */
function visibleRange(monthStart: LocalDate): [LocalDate, LocalDate] {
  return [addDays(monthStart, -6), addDays(monthStart, 41)]
}

/** 日期的標點級別對應的 modifier 名稱（react-day-picker 以它標記每個日期按鈕） */
const LEVEL_MODIFIERS = {
  none: 'workoutNone',
  low: 'workoutLow',
  medium: 'workoutMedium',
  high: 'workoutHigh',
} as const satisfies Record<DayLevel, string>

const LEVELS = Object.keys(LEVEL_MODIFIERS) as DayLevel[]

/** 日期按鈕的級別；沒有訓練的日期是 undefined */
function levelOf(modifiers: DayButtonProps['modifiers']): DayLevel | undefined {
  return LEVELS.find((level) => modifiers[LEVEL_MODIFIERS[level]])
}

/** 有訓練的日期在數字下方標點，依當天的組數分級（US-48） */
function HistoryDayButton({ children, ...props }: DayButtonProps) {
  const level = levelOf(props.modifiers)
  return (
    <CalendarDayButton locale={zhTW} {...props}>
      {children}
      {level && <DayLevelDot level={level} />}
    </CalendarDayButton>
  )
}

// 傳給 Calendar 的 components 與 labels 要是穩定的參考，否則日期按鈕會重新掛載
const calendarComponents: CalendarProps['components'] = { DayButton: HistoryDayButton }
const zhTWLabelDayButton = zhTW.labels?.labelDayButton
const calendarLabels: CalendarProps['labels'] = {
  /** 沿用繁中語系的名稱（例如「今天，2026年10月24日 星期六」），有訓練的日期加上「，有訓練（組數少）」等級別說明 */
  labelDayButton: (date, modifiers, options, dateLib) => {
    const label =
      typeof zhTWLabelDayButton === 'function'
        ? zhTWLabelDayButton(date, modifiers, options, dateLib)
        : labelDayButton(date, modifiers, options, dateLib)
    const level = levelOf(modifiers)
    return level ? `${label}，有訓練（${DAY_LEVEL_DESCRIPTIONS[level]}）` : label
  },
}

export function HistoryPage() {
  const [month, setMonth] = useState(() => monthStartOf(today()))
  // 預設選取今天，一進入就看得到今天的明細
  const [selected, setSelected] = useState<LocalDate>(() => today())
  const [from, to] = visibleRange(month)
  // 月曆畫面上的訓練，依當天的組數分級標點；一個月最多 31 筆，讀整筆訓練也很快
  const visibleWorkouts = useLiveData(
    (repositories) => repositories.workouts.listInRange(from, to),
    [from, to],
  )
  const datesByLevel = Object.fromEntries(LEVELS.map((level) => [level, [] as Date[]])) as Record<
    DayLevel,
    Date[]
  >
  for (const workout of visibleWorkouts ?? []) {
    datesByLevel[dayLevel(workout)].push(fromLocalDate(workout.date))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">歷史</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline" className="h-11">
            <Link to="/history/body-weight">
              <Scale aria-hidden="true" />
              體重紀錄
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-11">
            <Link to="/history/ai-prompt">
              <Sparkles aria-hidden="true" />
              AI 提示詞
            </Link>
          </Button>
        </div>
      </div>
      <TrainingRhythmSection />
      <Calendar
        className="mx-auto [--cell-size:--spacing(11)]"
        mode="single"
        selected={fromLocalDate(selected)}
        onSelect={(date) => setSelected(toLocalDate(date))}
        required
        locale={zhTW}
        weekStartsOn={1}
        month={fromLocalDate(month)}
        onMonthChange={(next) => setMonth(monthStartOf(toLocalDate(next)))}
        endMonth={fromLocalDate(today())}
        disabled={{ after: fromLocalDate(today()) }}
        modifiers={{
          workoutNone: datesByLevel.none,
          workoutLow: datesByLevel.low,
          workoutMedium: datesByLevel.medium,
          workoutHigh: datesByLevel.high,
        }}
        components={calendarComponents}
        labels={calendarLabels}
      />
      {/* 圖例：標點的意思與組數範圍，不靠顏色就看得懂 */}
      <ul
        aria-label="月曆標點圖例"
        className="-mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground"
      >
        {(['low', 'medium', 'high', 'none'] as const).map((level) => (
          <li key={level} className="flex items-center gap-1.5">
            <DayLevelDot level={level} />
            {DAY_LEVEL_LEGEND[level]}
          </li>
        ))}
      </ul>
      {/* 換日期時重新掛載，不會在新資料載入前短暫顯示上一天的內容（「複製到今天」也不會拿到上一天的訓練） */}
      <DayDetail key={selected} date={selected} />
      <PeriodStatsSection month={month} selected={selected} />
      <CategoryTrendSection />
    </div>
  )
}
