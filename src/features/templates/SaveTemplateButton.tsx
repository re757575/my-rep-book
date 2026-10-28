import { lazy, startTransition, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { Workout } from '@/domain'
import { cn } from '@/lib/utils'

// 名稱對話框不放進首次載入的 JS（PRD §7），第一次點擊時才載入
const SaveTemplateDialog = lazy(async () => ({
  default: (await import('./SaveTemplateDialog')).SaveTemplateDialog,
}))

/** 「存成範本」按鈕與它的名稱對話框（US-40）；訓練頁與歷史的日明細共用 */
export function SaveTemplateButton({
  workout,
  className,
}: {
  workout: Workout
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        className={cn('h-11 px-2', className)}
        onClick={() =>
          // 用 transition 等對話框載入完成再一次打開，不經過 Suspense 的 fallback
          startTransition(() => {
            setLoaded(true)
            setOpen(true)
          })
        }
      >
        存成範本
      </Button>
      {loaded && <SaveTemplateDialog open={open} onOpenChange={setOpen} workout={workout} />}
    </>
  )
}
