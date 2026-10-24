import { useEffect } from 'react'
import { Navigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { isValidLocalDate } from '@/domain'
import { today } from './dayPath'
import { TodayPage } from './TodayPage'

/** `/` 與 `/day/:date` 的訓練頁；未來或不合法的日期導回 `/` */
export function WorkoutDayRoute() {
  const date = useParams().date ?? today()

  if (!isValidLocalDate(date)) return <Navigate to="/" replace />
  if (date > today()) return <FutureDateRedirect />

  // 換日期時重新掛載，避免沿用前一天的資料
  return <TodayPage key={date} date={date} />
}

function FutureDateRedirect() {
  useEffect(() => {
    // 固定 id：StrictMode 下 effect 執行兩次也只會有一則 toast
    toast('無法記錄未來的日期', { id: 'future-date' })
  }, [])

  return <Navigate to="/" replace />
}
