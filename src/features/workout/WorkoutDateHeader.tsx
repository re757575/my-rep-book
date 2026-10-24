import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { zhTW } from 'react-day-picker/locale'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { addDays, formatDateTitle, fromLocalDate, toLocalDate, type LocalDate } from '@/domain'
import { dayPath, today } from './dayPath'

/** 訓練頁的日期標題：前一天、後一天、日期選擇器與回到今天 */
export function WorkoutDateHeader({ date }: { date: LocalDate }) {
  const navigate = useNavigate()
  const [pickerOpen, setPickerOpen] = useState(false)
  const isToday = date === today()
  const goTo = (target: LocalDate) => navigate(dayPath(target))

  return (
    <header className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="size-11"
        aria-label="前一天"
        onClick={() => goTo(addDays(date, -1))}
      >
        <ChevronLeft aria-hidden="true" />
      </Button>
      <h1 className="text-xl font-semibold">{formatDateTitle(date)}</h1>
      {isToday && <span className="text-sm text-muted-foreground">今天</span>}
      <Button
        variant="ghost"
        size="icon"
        className="size-11"
        aria-label="後一天"
        disabled={isToday}
        onClick={() => goTo(addDays(date, 1))}
      >
        <ChevronRight aria-hidden="true" />
      </Button>
      <div className="ml-auto flex items-center gap-1">
        {!isToday && (
          <Button variant="outline" className="h-11" onClick={() => goTo(today())}>
            回到今天
          </Button>
        )}
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="size-11" aria-label="選擇日期">
              <CalendarDays aria-hidden="true" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-auto p-0" aria-label="選擇日期">
            <Calendar
              mode="single"
              locale={zhTW}
              weekStartsOn={1}
              selected={fromLocalDate(date)}
              defaultMonth={fromLocalDate(date)}
              disabled={{ after: fromLocalDate(today()) }}
              endMonth={fromLocalDate(today())}
              required
              onSelect={(selected) => {
                setPickerOpen(false)
                goTo(toLocalDate(selected))
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    </header>
  )
}
