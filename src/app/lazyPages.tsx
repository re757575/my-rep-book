import { lazy } from 'react'

// 首次載入的 JS 要 < 250 KB（gzip，PRD §7）：打開 App 預設進入的訓練頁直接打包進入口，
// 其他分頁在第一次進入時才載入（各自帶著 react-day-picker、react-hook-form、zod 等較大的依賴）。
// 載入中由 AppLayout 的 Suspense 處理，底部分頁照常顯示。
// Service Worker 會預先快取這些 chunk，離線時切換分頁一樣可用。

export const HistoryPage = lazy(async () => ({
  default: (await import('@/features/history/HistoryPage')).HistoryPage,
}))

export const ExercisesPage = lazy(async () => ({
  default: (await import('@/features/exercises/ExercisesPage')).ExercisesPage,
}))

export const NewCustomExercisePage = lazy(async () => ({
  default: (await import('@/features/exercises/NewCustomExercisePage')).NewCustomExercisePage,
}))

export const ExerciseDetailPage = lazy(async () => ({
  default: (await import('@/features/exercises/ExerciseDetailPage')).ExerciseDetailPage,
}))

export const EditCustomExercisePage = lazy(async () => ({
  default: (await import('@/features/exercises/EditCustomExercisePage')).EditCustomExercisePage,
}))

export const SettingsPage = lazy(async () => ({
  default: (await import('@/features/settings/SettingsPage')).SettingsPage,
}))
