import { useId, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  filterExercises,
  isHiddenOrArchived,
  type CategoryFilter,
  type LibraryExercise,
} from '@/domain'
import { CategoryFilterBar } from '@/features/exercises/CategoryFilterBar'
import { ExerciseList } from '@/features/exercises/ExerciseList'
import { useLibraryExercises } from '@/features/exercises/useLibraryExercises'

/** 選單中可加入的動作：排除已隱藏、已封存；目前只開放「重量×次數」 */
function isSelectable(exercise: LibraryExercise) {
  return !isHiddenOrArchived(exercise) && exercise.trackingType === 'weight_reps'
}

/** 加入動作選單：全螢幕 Dialog，不改變路由，一次加入一個動作 */
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
        <DialogHeader>
          <DialogTitle className="text-lg">加入動作</DialogTitle>
        </DialogHeader>
        {/* 每次開啟都重新掛載，讓搜尋與分類回到初始狀態 */}
        {open && (
          <ExercisePicker
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

function ExercisePicker({ onSelect }: { onSelect: (exercise: LibraryExercise) => void }) {
  const searchId = useId()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const selectable = useLibraryExercises()?.filter(isSelectable)

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
      <CategoryFilterBar value={category} onChange={setCategory} />
      <div className="-mx-4 flex-1 overflow-y-auto px-4">
        {selectable && (
          <ExerciseList
            exercises={filterExercises(selectable, { query, category })}
            onSelect={onSelect}
          />
        )}
      </div>
    </>
  )
}
