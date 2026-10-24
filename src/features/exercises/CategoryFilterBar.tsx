import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { BROWSE_CATEGORIES, BROWSE_CATEGORY_LABELS, type CategoryFilter } from '@/domain'

const OPTIONS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  ...BROWSE_CATEGORIES.map((category) => ({
    value: category,
    label: BROWSE_CATEGORY_LABELS[category],
  })),
]

/** 分類列：「全部」加上 10 大類，可水平捲動，一次選一個 */
export function CategoryFilterBar({
  value,
  onChange,
}: {
  value: CategoryFilter
  onChange: (value: CategoryFilter) => void
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1">
      <ToggleGroup
        type="single"
        variant="outline"
        aria-label="篩選分類"
        value={value}
        // 再按一次已選的分類時 Radix 會給空字串，維持原本的選擇
        onValueChange={(next) => next && onChange(next as CategoryFilter)}
        className="w-max"
      >
        {OPTIONS.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value} className="h-11 min-w-11 px-3">
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
