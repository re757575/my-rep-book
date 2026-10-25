import { useId } from 'react'
import { usePersistentStorageStatus, type PersistentStorageStatus } from './persistentStorage'

const STATUS_TEXT: Readonly<Record<PersistentStorageStatus, string>> = {
  checking: '檢查中…',
  persisted: '已啟用',
  'not-persisted': '未啟用，瀏覽器可能在空間不足時清除資料，建議定期匯出',
}

/** 設定頁的「持久儲存」區塊：顯示瀏覽器是否同意持久儲存 */
export function PersistentStorageSection() {
  const id = useId()
  const status = usePersistentStorageStatus()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h2 id={id} className="font-semibold">
        持久儲存
      </h2>
      <p className="text-sm text-muted-foreground">{STATUS_TEXT[status]}</p>
    </section>
  )
}
