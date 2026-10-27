import { ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCollapseAll } from './useCollapsedWorkoutExercise'

/**
 * 一鍵收合或展開訓練頁上所有的動作（US-35）：還有動作是展開的時候是「全部收合」，
 * 全部都已收合時是「全部展開」。只有 1 個動作時沒有意義，不顯示。
 */
export function CollapseAllButton({
  workoutExerciseIds,
}: {
  workoutExerciseIds: readonly string[]
}) {
  const [allCollapsed, setAll] = useCollapseAll(workoutExerciseIds)
  if (workoutExerciseIds.length < 2) return null

  const Icon = allCollapsed ? ChevronsUpDown : ChevronsDownUp
  return (
    <Button
      variant="ghost"
      className="h-11 self-end text-muted-foreground"
      onClick={() => setAll(!allCollapsed)}
    >
      <Icon aria-hidden="true" />
      {allCollapsed ? '全部展開' : '全部收合'}
    </Button>
  )
}
