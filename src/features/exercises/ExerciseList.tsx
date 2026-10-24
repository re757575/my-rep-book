import { Link } from 'react-router'
import { EQUIPMENT_LABELS, isHiddenOrArchived, type LibraryExercise } from '@/domain'

const ROW_CLASS_NAME = 'flex min-h-14 w-full flex-col justify-center py-2 text-left'

function ExerciseRowContent({ exercise }: { exercise: LibraryExercise }) {
  return (
    <>
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
    </>
  )
}

/**
 * 動作清單：每一列顯示中文名、英文名與器材。
 * 預設點選進入動作詳情；傳入 `onSelect` 時，每一列改為按鈕，點選時交給呼叫端處理（例如加入當天訓練）。
 */
export function ExerciseList({
  exercises,
  onSelect,
  label = '動作清單',
}: {
  exercises: readonly LibraryExercise[]
  onSelect?: (exercise: LibraryExercise) => void
  /** 清單的無障礙名稱 */
  label?: string
}) {
  if (exercises.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">找不到符合的動作</p>
  }

  return (
    <ul aria-label={label} className="divide-y">
      {exercises.map((exercise) => (
        <li key={exercise.id}>
          {onSelect ? (
            <button type="button" className={ROW_CLASS_NAME} onClick={() => onSelect(exercise)}>
              <ExerciseRowContent exercise={exercise} />
            </button>
          ) : (
            <Link to={`/exercises/${exercise.id}`} className={ROW_CLASS_NAME}>
              <ExerciseRowContent exercise={exercise} />
            </Link>
          )}
        </li>
      ))}
    </ul>
  )
}
