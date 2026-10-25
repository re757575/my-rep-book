import { Plus } from 'lucide-react'
import { lazy, startTransition, useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useLiveData, useRepositories } from '@/data'
import {
  RECENT_EXERCISES_LIMIT,
  filterExercises,
  getRecentExercises,
  isHiddenOrArchived,
  type CategoryFilter,
  type LibraryExercise,
  type Workout,
} from '@/domain'
import { CategoryFilterBar } from '@/features/exercises/CategoryFilterBar'
import { ExerciseList } from '@/features/exercises/ExerciseList'

// 自訂動作表單帶著 react-hook-form 與 zod，按「新增自訂動作」才載入，不放進首次載入的 JS（PRD §7）
const CustomExerciseForm = lazy(async () => ({
  default: (await import('@/features/exercises/CustomExerciseForm')).CustomExerciseForm,
}))

/** 往前找最近使用的動作時，每批讀取的訓練筆數 */
const WORKOUT_PAGE_SIZE = 30

interface PickerExercises {
  /** 動作庫的全部動作（含已隱藏、已封存），用於新增自訂動作時檢查重名 */
  library: LibraryExercise[]
  recent: LibraryExercise[]
}

/**
 * 選單需要的動作：動作庫的全部動作與最近使用的動作。
 * 由新到舊分批讀取訓練，湊滿最近使用的上限或讀完全部訓練就停止。載入中為 undefined。
 */
function usePickerExercises(): PickerExercises | undefined {
  return useLiveData(async (repositories) => {
    const library = await repositories.exercises.listAll()
    const workouts: Workout[] = []
    for (let offset = 0; ; offset += WORKOUT_PAGE_SIZE) {
      const page = await repositories.workouts.listRecent({ limit: WORKOUT_PAGE_SIZE, offset })
      workouts.push(...page)
      const recent = getRecentExercises(workouts, library)
      if (recent.length >= RECENT_EXERCISES_LIMIT || page.length < WORKOUT_PAGE_SIZE) {
        return { library, recent }
      }
    }
  }, [])
}

/**
 * 加入動作選單：全螢幕 Dialog，不改變路由，一次加入一個動作。
 * 也可以就地新增自訂動作，建立後直接加入。
 */
export function AddExerciseDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (exercise: LibraryExercise) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="inset-0 top-0 left-0 flex h-dvh max-w-none translate-x-0 translate-y-0 flex-col gap-4 rounded-none p-4 ring-0 sm:max-w-none data-open:zoom-in-100 data-closed:zoom-out-100"
      >
        {/* 每次開啟都重新掛載，讓搜尋、分類與畫面回到初始狀態 */}
        {open && (
          <AddExerciseContent
            onSelect={(exercise) => {
              onSelect(exercise)
              onOpenChange(false)
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function AddExerciseContent({ onSelect }: { onSelect: (exercise: LibraryExercise) => void }) {
  const [creating, setCreating] = useState(false)
  const { exercises } = useRepositories()
  const picker = usePickerExercises()

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg">{creating ? '新增自訂動作' : '加入動作'}</DialogTitle>
      </DialogHeader>
      {creating ? (
        <div className="-mx-4 flex-1 overflow-y-auto px-4">
          {picker && (
            <CustomExerciseForm
              existing={picker.library}
              onCancel={() => setCreating(false)}
              onSubmit={async (input) => onSelect(await exercises.createCustom(input))}
            />
          )}
        </div>
      ) : (
        <ExercisePicker
          exercises={picker}
          onSelect={onSelect}
          // 表單是動態載入的：用 transition 等它載入完成再切換，不經過 Suspense 的 fallback
          onCreate={() => startTransition(() => setCreating(true))}
        />
      )}
    </>
  )
}

function ExercisePicker({
  exercises,
  onSelect,
  onCreate,
}: {
  exercises: PickerExercises | undefined
  onSelect: (exercise: LibraryExercise) => void
  onCreate: () => void
}) {
  const searchId = useId()
  const recentHeadingId = useId()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  // 搜尋或篩選時只看結果清單
  const recent = query.trim() === '' && category === 'all' ? exercises?.recent : undefined
  const selectable = exercises?.library.filter((exercise) => !isHiddenOrArchived(exercise))

  return (
    <>
      <label htmlFor={searchId} className="sr-only">
        搜尋動作
      </label>
      <Input
        id={searchId}
        type="search"
        placeholder="搜尋中文或英文名稱"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="h-11"
      />
      <div className="-mx-4 flex flex-1 flex-col gap-4 overflow-y-auto px-4">
        {recent && recent.length > 0 && (
          <section aria-labelledby={recentHeadingId} className="flex flex-col">
            <h3 id={recentHeadingId} className="text-sm font-medium text-muted-foreground">
              最近使用
            </h3>
            <ExerciseList exercises={recent} onSelect={onSelect} label="最近使用" />
          </section>
        )}
        {/* 捲動清單時分類列固定在上方 */}
        <div className="sticky top-0 z-10 bg-background">
          <CategoryFilterBar value={category} onChange={setCategory} />
        </div>
        {selectable && (
          <ExerciseList
            exercises={filterExercises(selectable, { query, category })}
            onSelect={onSelect}
          />
        )}
      </div>
      <Button variant="outline" className="h-11" onClick={onCreate}>
        <Plus aria-hidden="true" />
        新增自訂動作
      </Button>
    </>
  )
}
