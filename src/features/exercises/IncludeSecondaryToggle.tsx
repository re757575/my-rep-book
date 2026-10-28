import { useId } from 'react'
import { Switch } from '@/components/ui/switch'
import type { CategoryFilter } from '@/domain'

/**
 * 「包含次要部位」開關（US-49）。選「全部」時沒有意義，不顯示；
 * 狀態由呼叫端持有，切回「全部」再選別的分類時維持原本的開或關。
 */
export function IncludeSecondaryToggle({
  category,
  checked,
  onCheckedChange,
}: {
  category: CategoryFilter
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  const id = useId()
  if (category === 'all') return null

  return (
    <label htmlFor={id} className="flex min-h-11 items-center justify-between gap-4 text-sm">
      包含次要部位
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  )
}
