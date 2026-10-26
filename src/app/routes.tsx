import type { RouteObject } from 'react-router'
import { WorkoutDayRoute } from '@/features/workout/WorkoutDayRoute'
import { AppLayout } from './AppLayout'
import {
  AiPromptPage,
  BodyWeightHistoryPage,
  EditCustomExercisePage,
  ExerciseDetailPage,
  ExercisesPage,
  HistoryPage,
  NewCustomExercisePage,
  SettingsPage,
} from './lazyPages'

export const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <WorkoutDayRoute /> },
      { path: 'day/:date', element: <WorkoutDayRoute /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'history/body-weight', element: <BodyWeightHistoryPage /> },
      { path: 'history/ai-prompt', element: <AiPromptPage /> },
      { path: 'exercises', element: <ExercisesPage /> },
      { path: 'exercises/new', element: <NewCustomExercisePage /> },
      { path: 'exercises/:id', element: <ExerciseDetailPage /> },
      { path: 'exercises/:id/edit', element: <EditCustomExercisePage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]
