import { ChevronLeft } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { Button } from '@/components/ui/button'
import { useRepositories } from '@/data'
import {
  EQUIPMENT_LABELS,
  MUSCLE_LABELS,
  TRACKING_TYPE_LABELS,
  type CustomExercise,
  type LibraryExercise,
  type Muscle,
} from '@/domain'
import { useLibraryExercise } from './useLibraryExercises'

function formatMuscles(muscles: readonly Muscle[]) {
  return muscles.length === 0 ? '無' : muscles.map((muscle) => MUSCLE_LABELS[muscle]).join('、')
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  const id = useId()
  return (
    <div className="flex justify-between gap-4 py-3">
      <dt id={id} className="text-muted-foreground">
        {label}
      </dt>
      <dd aria-labelledby={id} className="text-right">
        {children}
      </dd>
    </div>
  )
}

function PresetActions({ exercise }: { exercise: LibraryExercise & { source: 'preset' } }) {
  const { exercises } = useRepositories()

  return (
    <>
      <Button asChild variant="outline" className="h-11">
        <Link to={`/exercises/new?copyFrom=${exercise.id}`}>複製為自訂動作</Link>
      </Button>
      {exercise.hidden ? (
        <Button
          variant="outline"
          className="h-11"
          onClick={() => exercises.unhidePreset(exercise.id)}
        >
          取消隱藏
        </Button>
      ) : (
        <Button
          variant="outline"
          className="h-11"
          onClick={() => exercises.hidePreset(exercise.id)}
        >
          隱藏
        </Button>
      )}
    </>
  )
}

function CustomActions({ exercise }: { exercise: CustomExercise }) {
  return (
    <Button asChild variant="outline" className="h-11">
      <Link to={`/exercises/${exercise.id}/edit`}>編輯</Link>
    </Button>
  )
}

export function ExerciseDetailPage() {
  const { id = '' } = useParams()
  const exercise = useLibraryExercise(id)

  return (
    <div className="flex flex-col gap-4">
      <Link
        to="/exercises"
        className="-ml-2 flex min-h-11 w-max items-center gap-1 pr-2 text-sm text-muted-foreground"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        返回動作庫
      </Link>

      {exercise === null && (
        <p className="py-8 text-center text-muted-foreground">找不到這個動作</p>
      )}

      {exercise && (
        <>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold">{exercise.nameZh}</h1>
            {exercise.source === 'preset' && exercise.hidden && (
              <p className="text-sm text-muted-foreground">已隱藏</p>
            )}
          </div>

          <dl className="divide-y">
            <DetailRow label="英文名稱">{exercise.nameEn ?? '無'}</DetailRow>
            <DetailRow label="主要部位">{formatMuscles(exercise.primaryMuscles)}</DetailRow>
            <DetailRow label="次要部位">{formatMuscles(exercise.secondaryMuscles)}</DetailRow>
            <DetailRow label="器材">{EQUIPMENT_LABELS[exercise.equipment]}</DetailRow>
            <DetailRow label="記錄類型">{TRACKING_TYPE_LABELS[exercise.trackingType]}</DetailRow>
          </dl>

          {exercise.source === 'preset' ? (
            <PresetActions exercise={exercise} />
          ) : (
            <CustomActions exercise={exercise} />
          )}
        </>
      )}
    </div>
  )
}
