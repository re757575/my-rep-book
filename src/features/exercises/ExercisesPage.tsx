import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { filterExercises, isHiddenOrArchived, type CategoryFilter } from '@/domain'
import { CategoryFilterBar } from './CategoryFilterBar'
import { ExerciseList } from './ExerciseList'
import { IncludeSecondaryToggle } from './IncludeSecondaryToggle'
import { useLibraryExercises } from './useLibraryExercises'

export function ExercisesPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [includeSecondary, setIncludeSecondary] = useState(false)
  const [showHiddenOrArchived, setShowHiddenOrArchived] = useState(false)
  const library = useLibraryExercises()
  const listed = showHiddenOrArchived
    ? library
    : library?.filter((exercise) => !isHiddenOrArchived(exercise))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">動作庫</h1>
        <Button asChild variant="outline" className="h-11">
          <Link to="/exercises/new">
            <Plus aria-hidden="true" />
            新增自訂動作
          </Link>
        </Button>
      </div>
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
      <IncludeSecondaryToggle
        category={category}
        checked={includeSecondary}
        onCheckedChange={setIncludeSecondary}
      />
      <label
        htmlFor="show-hidden-or-archived"
        className="flex min-h-11 items-center justify-between gap-4 text-sm"
      >
        顯示已隱藏／已封存
        <Switch
          id="show-hidden-or-archived"
          checked={showHiddenOrArchived}
          onCheckedChange={setShowHiddenOrArchived}
        />
      </label>
      {listed && (
        <ExerciseList exercises={filterExercises(listed, { query, category, includeSecondary })} />
      )}
    </div>
  )
}
