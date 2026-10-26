import { Scale } from 'lucide-react'
import { useState, type ComponentProps } from 'react'
import { labelDayButton, type DayButtonProps } from 'react-day-picker'
import { zhTW } from 'react-day-picker/locale'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Calendar, CalendarDayButton } from '@/components/ui/calendar'
import { useLiveData } from '@/data'
import { addDays, fromLocalDate, toLocalDate, type LocalDate } from '@/domain'
import { today } from '@/features/workout/dayPath'
import { DayDetail } from './DayDetail'
import { PeriodStatsSection } from './PeriodStatsSection'

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

/** 有訓練的日期在數字下方標點 */
function HistoryDayButton({ children, ...props }: DayButtonProps) {
  return (
    <CalendarDayButton locale={zhTW} {...props}>
      {children}
      {props.modifiers.hasWorkout && (
        <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      )}
    </CalendarDayButton>
  )
}

// 傳給 Calendar 的 components 與 labels 要是穩定的參考，否則日期按鈕會重新掛載
const calendarComponents: CalendarProps['components'] = { DayButton: HistoryDayButton }
const zhTWLabelDayButton = zhTW.labels?.labelDayButton
const calendarLabels: CalendarProps['labels'] = {
  /** 沿用繁中語系的名稱（例如「今天，2026年10月24日 星期六」），有訓練的日期加上「，有訓練」 */
  labelDayButton: (date, modifiers, options, dateLib) => {
    const label =
      typeof zhTWLabelDayButton === 'function'
        ? zhTWLabelDayButton(date, modifiers, options, dateLib)
        : labelDayButton(date, modifiers, options, dateLib)
    return modifiers.hasWorkout ? `${label}，有訓練` : label
  },
}

export function HistoryPage() {
  const [month, setMonth] = useState(() => monthStartOf(today()))
  const [selected, setSelected] = useState<LocalDate>()
  const [from, to] = visibleRange(month)
  const workoutDates = useLiveData(
    (repositories) => repositories.workouts.listDatesInRange(from, to),
    [from, to],
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">歷史</h1>
        <Button asChild variant="outline" className="h-11">
          <Link to="/history/body-weight">
            <Scale aria-hidden="true" />
            體重紀錄
          </Link>
        </Button>
      </div>
      <Calendar
        className="mx-auto [--cell-size:--spacing(11)]"
        mode="single"
        selected={selected === undefined ? undefined : fromLocalDate(selected)}
        onSelect={(date) => setSelected(toLocalDate(date))}
        required
        locale={zhTW}
        weekStartsOn={1}
        month={fromLocalDate(month)}
        onMonthChange={(next) => setMonth(monthStartOf(toLocalDate(next)))}
        endMonth={fromLocalDate(today())}
        disabled={{ after: fromLocalDate(today()) }}
        modifiers={{ hasWorkout: (workoutDates ?? []).map(fromLocalDate) }}
        components={calendarComponents}
        labels={calendarLabels}
      />
      {selected ? (
        <DayDetail date={selected} />
      ) : (
        <p className="py-4 text-center text-muted-foreground">點選日期查看當天明細</p>
      )}
      <PeriodStatsSection month={month} selected={selected} />
    </div>
  )
}
