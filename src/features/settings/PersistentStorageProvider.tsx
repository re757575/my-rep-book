import { useEffect, useState, type ReactNode } from 'react'
import {
  PersistentStorageContext,
  requestPersistentStorage,
  type PersistentStorageStatus,
} from './persistentStorage'

/**
 * App 啟動時向瀏覽器申請持久儲存（US-21），並把結果提供給設定頁。
 * 已經是持久儲存時不會再申請；還沒啟用時每次啟動都再申請一次，
 * 因為 Chrome 等瀏覽器常在 App 加到主畫面之後才同意。
 */
export function PersistentStorageProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<PersistentStorageStatus>('checking')
  useEffect(() => {
    let active = true
    void requestPersistentStorage().then((result) => {
      if (active) setStatus(result)
    })
    return () => {
      active = false
    }
  }, [])
  return <PersistentStorageContext value={status}>{children}</PersistentStorageContext>
}
