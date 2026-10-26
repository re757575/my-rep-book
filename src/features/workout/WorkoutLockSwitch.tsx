import { Lock, LockOpen } from 'lucide-react'
import { useId } from 'react'
import { Toggle } from '@/components/ui/toggle'

/**
 * 訓練頁的鎖定開關：鎖定時不能修改這天的紀錄。用首頁已載入的 Toggle（aria-pressed），
 * 不用 Switch：Switch 只在動作庫頁用到，首頁也用的話首次載入的 JS 多約 3 KB
 */
export function WorkoutLockSwitch({
  locked,
  onLockedChange,
}: {
  locked: boolean
  onLockedChange: (locked: boolean) => void
}) {
  const statusId = useId()
  const Icon = locked ? Lock : LockOpen
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span id={statusId} className="flex-1">
        {locked ? '已鎖定，不能修改這天的紀錄' : '可以修改這天的紀錄'}
      </span>
      <Toggle
        variant="outline"
        aria-describedby={statusId}
        pressed={locked}
        onPressedChange={onLockedChange}
        className="h-11 gap-1 px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
      >
        <Icon aria-hidden="true" />
        鎖定
      </Toggle>
    </div>
  )
}
