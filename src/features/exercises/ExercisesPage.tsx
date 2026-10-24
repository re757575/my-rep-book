import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { PRESET_EXERCISES, filterExercises, type CategoryFilter } from '@/domain'
import { CategoryFilterBar } from './CategoryFilterBar'
import { ExerciseList } from './ExerciseList'

export function ExercisesPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const exercises = filterExercises(PRESET_EXERCISES, { query, category })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">動作庫</h1>
      <label htmlFor="exercise-search" className="sr-only">
        搜尋動作
      </label>
      <Input
        id="exercise-search"
        type="search"
        placeholder="搜尋中文或英文名稱"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="h-11"
      />
      <CategoryFilterBar value={category} onChange={setCategory} />
      <ExerciseList exercises={exercises} />
    </div>
  )
}
