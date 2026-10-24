import { Link } from 'react-router'
import { EQUIPMENT_LABELS, isHiddenOrArchived, type LibraryExercise } from '@/domain'

/** 動作清單：每一列顯示中文名、英文名與器材，點選進入動作詳情 */
export function ExerciseList({ exercises }: { exercises: readonly LibraryExercise[] }) {
  if (exercises.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">找不到符合的動作</p>
  }

  return (
    <ul aria-label="動作清單" className="divide-y">
      {exercises.map((exercise) => (
        <li key={exercise.id}>
          <Link
            to={`/exercises/${exercise.id}`}
            className="flex min-h-14 flex-col justify-center py-2"
          >
            <span className="font-medium">
              {exercise.nameZh}
              {isHiddenOrArchived(exercise) && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {exercise.source === 'preset' ? '已隱藏' : '已封存'}
                </span>
              )}
            </span>
            <span className="text-sm text-muted-foreground">
              {exercise.nameEn && <span>{exercise.nameEn}</span>}
              {exercise.nameEn && <span aria-hidden="true"> · </span>}
              <span>{EQUIPMENT_LABELS[exercise.equipment]}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
