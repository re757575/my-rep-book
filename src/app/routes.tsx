import type { RouteObject } from 'react-router'
import { EditCustomExercisePage } from '@/features/exercises/EditCustomExercisePage'
import { ExerciseDetailPage } from '@/features/exercises/ExerciseDetailPage'
import { ExercisesPage } from '@/features/exercises/ExercisesPage'
import { NewCustomExercisePage } from '@/features/exercises/NewCustomExercisePage'
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
      { path: 'exercises/new', element: <NewCustomExercisePage /> },
      { path: 'exercises/:id', element: <ExerciseDetailPage /> },
      { path: 'exercises/:id/edit', element: <EditCustomExercisePage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]
