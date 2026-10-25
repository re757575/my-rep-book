import { ChevronLeft } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useLiveData, useRepositories } from '@/data'
import {
  EQUIPMENT_LABELS,
  MUSCLE_LABELS,
  TRACKING_TYPE_LABELS,
  isHiddenOrArchived,
  type CustomExercise,
  type LibraryExercise,
  type Muscle,
} from '@/domain'
import { ExerciseHistory } from './ExerciseHistory'
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

/** 刪除沒有紀錄的自訂動作：先跳出確認對話框，確認後永久刪除並回到動作庫 */
function DeleteCustomButton({ exercise }: { exercise: CustomExercise }) {
  const { exercises } = useRepositories()
  const navigate = useNavigate()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="h-11">
          刪除
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>刪除「{exercise.nameZh}」？</AlertDialogTitle>
          <AlertDialogDescription>刪除後無法復原。</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11">取消</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            className="h-11"
            onClick={async () => {
              await exercises.deleteCustom(exercise.id)
              await navigate('/exercises', { replace: true })
            }}
          >
            刪除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function CustomActions({ exercise }: { exercise: CustomExercise }) {
  const { exercises } = useRepositories()
  const hasRecords = useLiveData(
    (repositories) => repositories.workouts.hasAnyWithExercise(exercise.id),
    [exercise.id],
  )

  return (
    <>
      <Button asChild variant="outline" className="h-11">
        <Link to={`/exercises/${exercise.id}/edit`}>編輯</Link>
      </Button>
      {exercise.archived ? (
        <Button
          variant="outline"
          className="h-11"
          onClick={() => exercises.unarchiveCustom(exercise.id)}
        >
          取消封存
        </Button>
      ) : (
        hasRecords && (
          <Button
            variant="outline"
            className="h-11"
            onClick={() => exercises.archiveCustom(exercise.id)}
          >
            封存
          </Button>
        )
      )}
      {/* 已有紀錄的動作只能封存，不能刪除 */}
      {hasRecords === false && <DeleteCustomButton exercise={exercise} />}
    </>
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
            {isHiddenOrArchived(exercise) && (
              <p className="text-sm text-muted-foreground">
                {exercise.source === 'preset' ? '已隱藏' : '已封存'}
              </p>
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

          <ExerciseHistory exerciseId={exercise.id} />
        </>
      )}
    </div>
  )
}
