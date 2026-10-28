import { lazy, startTransition, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { LocalDate } from '@/domain'
import { cn } from '@/lib/utils'
import { whenIdleAfterLoad } from '@/lib/whenIdleAfterLoad'

// 範本選單不放進首次載入的 JS（PRD §7）；頁面載入後趁閒置先載入，第一次打開時就不用等下載
const loadTemplatePicker = () => import('./TemplatePickerDialog')
const TemplatePickerDialog = lazy(async () => ({
  default: (await loadTemplatePicker()).TemplatePickerDialog,
}))

/** 訓練頁的「從範本加入」按鈕與它的選單（US-41）：把範本的動作加到 `date` 的訓練最後面 */
export function ApplyTemplateButton({ date, className }: { date: LocalDate; className?: string }) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => whenIdleAfterLoad(() => void loadTemplatePicker()), [])

  return (
    <>
      <Button
        variant="outline"
        className={cn('h-11 px-2', className)}
        onClick={() =>
          // 用 transition 等選單載入完成再一次打開，不經過 Suspense 的 fallback
          startTransition(() => {
            setLoaded(true)
            setOpen(true)
          })
        }
      >
        從範本加入
      </Button>
      {/* 第一次打開才載入；之後保持掛載，關閉時才有動畫 */}
      {loaded && <TemplatePickerDialog open={open} onOpenChange={setOpen} date={date} />}
    </>
  )
}
