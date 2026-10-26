import { createContext, use } from 'react'

/**
 * 訓練頁是否鎖定（唯讀）：鎖定時各組數值、備註與體重只能看不能改，
 * 新增、刪除、排序的按鈕不顯示。由 `TodayPage` 提供。
 */
export const WorkoutReadOnlyContext = createContext(false)

export function useWorkoutReadOnly(): boolean {
  return use(WorkoutReadOnlyContext)
}
