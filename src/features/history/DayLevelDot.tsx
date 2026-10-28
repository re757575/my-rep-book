import type { DayLevel } from '@/domain'
import { cn } from '@/lib/utils'

/** 標點的樣式：同一個色調（目前的文字色），越多組越大、越深；「未完成」是空心圈（US-48） */
const DOT_CLASS: Readonly<Record<DayLevel, string>> = {
  none: 'size-2 border-[1.5px] border-current opacity-75',
  low: 'size-1.5 bg-current opacity-50',
  medium: 'size-2 bg-current opacity-75',
  high: 'size-2.5 bg-current',
}

/**
 * 月曆與圖例共用的標點；只是裝飾，意思由日期按鈕的名稱與圖例的文字傳達。
 * 用 `<i>` 而不是 `<span>`：shadcn 的日期按鈕對子層的 `span` 套了固定的透明度（`[&>span]:opacity-70`），
 * 會蓋掉各級別的深淺
 */
export function DayLevelDot({ level }: { level: DayLevel }) {
  return (
    <i
      aria-hidden="true"
      data-level={level}
      className={cn('inline-block rounded-full not-italic', DOT_CLASS[level])}
    />
  )
}
