import { zhTW } from 'react-day-picker/locale'
import { Calendar } from '@/components/ui/calendar'
import { fromLocalDate, toLocalDate, type LocalDate } from '@/domain'
import { today } from './dayPath'

/** 訓練頁的日期選擇器：不能選未來的日期 */
export function WorkoutDatePicker({
  date,
  onSelect,
}: {
  date: LocalDate
  onSelect: (date: LocalDate) => void
}) {
  return (
    <Calendar
      mode="single"
      locale={zhTW}
      weekStartsOn={1}
      selected={fromLocalDate(date)}
      defaultMonth={fromLocalDate(date)}
      disabled={{ after: fromLocalDate(today()) }}
      endMonth={fromLocalDate(today())}
      required
      onSelect={(selected) => onSelect(toLocalDate(selected))}
    />
  )
}
