import { useNavigate, useSearchParams } from 'react-router'
import { useRepositories } from '@/data'
import { CustomExerciseForm } from './CustomExerciseForm'
import { EMPTY_CUSTOM_EXERCISE_FORM, copyOfPresetFormValues } from './customExerciseSchema'
import { useLibraryExercises } from './useLibraryExercises'

/**
 * `/exercises/new`：新增自訂動作，建立後回到動作庫。
 * 「複製為自訂動作」時以 `?copyFrom=<預設動作 ID>` 指定來源，表單帶入該預設動作的資料。
 */
export function NewCustomExercisePage() {
  const { exercises } = useRepositories()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const library = useLibraryExercises()
  const copyFrom = searchParams.get('copyFrom')
  const preset = library?.find((e) => e.id === copyFrom && e.source === 'preset')

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">新增自訂動作</h1>
      {library && (
        <CustomExerciseForm
          defaultValues={preset ? copyOfPresetFormValues(preset) : EMPTY_CUSTOM_EXERCISE_FORM}
          existing={library}
          cancelTo="/exercises"
          onSubmit={async (input) => {
            await exercises.createCustom(input)
            await navigate('/exercises')
          }}
        />
      )}
    </div>
  )
}
