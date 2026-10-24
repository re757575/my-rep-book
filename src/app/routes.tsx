import type { RouteObject } from 'react-router'
import { ExercisesPage } from '@/features/exercises/ExercisesPage'
import { HistoryPage } from '@/features/history/HistoryPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { TodayPage } from '@/features/workout/TodayPage'
import { AppLayout } from './AppLayout'

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <TodayPage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'exercises', element: <ExercisesPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]
