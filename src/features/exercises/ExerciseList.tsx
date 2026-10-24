import { EQUIPMENT_LABELS, type ExerciseBase } from '@/domain'

/** 動作清單：每一列顯示中文名、英文名與器材 */
export function ExerciseList({ exercises }: { exercises: readonly ExerciseBase[] }) {
  if (exercises.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">找不到符合的動作</p>
  }

  return (
    <ul aria-label="動作清單" className="divide-y">
      {exercises.map((exercise) => (
        <li key={exercise.id} className="flex min-h-14 flex-col justify-center py-2">
          <span className="font-medium">{exercise.nameZh}</span>
          <span className="text-sm text-muted-foreground">
            {exercise.nameEn && <span>{exercise.nameEn}</span>}
            {exercise.nameEn && <span aria-hidden="true"> · </span>}
            <span>{EQUIPMENT_LABELS[exercise.equipment]}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
