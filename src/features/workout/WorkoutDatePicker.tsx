import type { ReactNode } from 'react'
import { zhTW } from 'react-day-picker/locale'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { fromLocalDate, toLocalDate, type LocalDate } from '@/domain'
import { today } from './dayPath'

/** 訓練頁的日期選擇器：點 `trigger` 打開月曆，不能選未來的日期 */
export function WorkoutDatePicker({
  date,
  open,
  onOpenChange,
  onSelect,
  trigger,
}: {
  date: LocalDate
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (date: LocalDate) => void
  trigger: ReactNode
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0" aria-label="選擇日期">
        <Calendar
          // 日期按鈕是觸控目標，至少 44×44 px（PRD §7）
          className="[--cell-size:--spacing(11)]"
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
      </PopoverContent>
    </Popover>
  )
}
