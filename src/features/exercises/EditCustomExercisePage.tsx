import { useNavigate, useParams } from 'react-router'
import { useLiveData, useRepositories } from '@/data'
import { CustomExerciseForm } from './CustomExerciseForm'
import { formValuesFrom } from './customExerciseSchema'
import { useLibraryExercises } from './useLibraryExercises'

/** `/exercises/:id/edit`：編輯自訂動作，儲存後回到動作詳情 */
export function EditCustomExercisePage() {
  const { id = '' } = useParams()
  const { exercises } = useRepositories()
  const navigate = useNavigate()
  const library = useLibraryExercises()
  const exercise = library?.find((e) => e.id === id && e.source === 'custom')
  const hasRecords = useLiveData(
    (repositories) => repositories.workouts.hasAnyWithExercise(id),
    [id],
  )

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">編輯自訂動作</h1>
      {library && !exercise && (
        <p className="py-8 text-center text-muted-foreground">找不到這個自訂動作</p>
      )}
      {library && exercise && hasRecords !== undefined && (
        <CustomExerciseForm
          defaultValues={formValuesFrom(exercise)}
          existing={library}
          excludeId={exercise.id}
          cancelTo={`/exercises/${exercise.id}`}
          trackingTypeLocked={hasRecords}
          onSubmit={async (input) => {
            await exercises.updateCustom(exercise.id, input)
            await navigate(`/exercises/${exercise.id}`, { replace: true })
          }}
        />
      )}
    </div>
  )
}
