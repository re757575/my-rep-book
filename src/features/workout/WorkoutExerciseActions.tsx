import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** 訓練動作標題旁的操作：上移、下移、刪除動作（可復原，不跳確認視窗） */
export function WorkoutExerciseActions({
  isFirst,
  isLast,
  onMove,
  onDelete,
}: {
  isFirst: boolean
  isLast: boolean
  onMove: (direction: 'up' | 'down') => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center">
      <Button
        variant="ghost"
        size="icon"
        className="size-11"
        aria-label="上移"
        disabled={isFirst}
        onClick={() => onMove('up')}
      >
        <ArrowUp aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-11"
        aria-label="下移"
        disabled={isLast}
        onClick={() => onMove('down')}
      >
        <ArrowDown aria-hidden="true" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-11 text-muted-foreground"
        aria-label="刪除動作"
        onClick={onDelete}
      >
        <Trash2 aria-hidden="true" />
      </Button>
    </div>
  )
}
