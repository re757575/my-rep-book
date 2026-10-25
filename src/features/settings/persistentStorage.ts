import { createContext, use } from 'react'

/** 持久儲存的狀態：`checking` 為還在等瀏覽器回應 */
export type PersistentStorageStatus = 'checking' | 'persisted' | 'not-persisted'

/**
 * 向瀏覽器申請持久儲存，回傳結果。已經是持久儲存時不再申請；
 * 瀏覽器不支援（例如非 HTTPS）或申請失敗都視為未啟用。
 */
export async function requestPersistentStorage(): Promise<
  Exclude<PersistentStorageStatus, 'checking'>
> {
  const storage = navigator.storage as StorageManager | undefined
  if (!storage?.persist) return 'not-persisted'
  try {
    const persisted = (await storage.persisted()) || (await storage.persist())
    return persisted ? 'persisted' : 'not-persisted'
  } catch (error) {
    console.error('申請持久儲存失敗', error)
    return 'not-persisted'
  }
}

/** 由 `PersistentStorageProvider` 提供 */
export const PersistentStorageContext = createContext<PersistentStorageStatus>('checking')

export function usePersistentStorageStatus(): PersistentStorageStatus {
  return use(PersistentStorageContext)
}
