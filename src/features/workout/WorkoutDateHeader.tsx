import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { lazy, startTransition, useState, type ComponentProps } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { addDays, formatDateTitle, type LocalDate } from '@/domain'
import { dayPath, today } from './dayPath'

// 日期選擇器帶著 react-day-picker、date-fns 與 Popover（floating-ui），第一次打開時才載入，
// 不放進首次載入的 JS（PRD §7）
const WorkoutDatePicker = lazy(async () => ({
  default: (await import('./WorkoutDatePicker')).WorkoutDatePicker,
}))

/** 訓練頁的日期標題：前一天、後一天、日期選擇器與回到今天 */
export function WorkoutDateHeader({ date }: { date: LocalDate }) {
  const navigate = useNavigate()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerLoaded, setPickerLoaded] = useState(false)
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
        {pickerLoaded ? (
          <WorkoutDatePicker
            date={date}
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            onSelect={(selected) => {
              setPickerOpen(false)
              goTo(selected)
            }}
            trigger={<DatePickerButton />}
          />
        ) : (
          // 第一次點擊前只是一般按鈕；點了才載入選擇器，載入完成後直接打開。
          // 用 transition 等載入完成再換上選擇器，不經過 Suspense 的 fallback
          <DatePickerButton
            onClick={() =>
              startTransition(() => {
                setPickerLoaded(true)
                setPickerOpen(true)
              })
            }
          />
        )}
      </div>
    </header>
  )
}

/** 打開日期選擇器的按鈕；載入選擇器前後是同一個樣子 */
function DatePickerButton(props: ComponentProps<typeof Button>) {
  return (
    <Button variant="ghost" size="icon" className="size-11" aria-label="選擇日期" {...props}>
      <CalendarDays aria-hidden="true" />
    </Button>
  )
}
