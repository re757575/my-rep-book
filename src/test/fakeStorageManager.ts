import { onTestFinished } from 'vitest'

/**
 * jsdom 沒有 `navigator.storage`。用這個假的 StorageManager 模擬瀏覽器對持久儲存的回應，
 * 測試結束時自動移除，所以只影響目前的測試。
 *
 * @param grantsPersistence 呼叫 `persist()` 時瀏覽器是否同意
 * @param persisted 一開始是否已經是持久儲存（例如之前已同意過）
 */
export function fakeStorageManager({
  grantsPersistence,
  persisted = false,
}: {
  grantsPersistence: boolean
  persisted?: boolean
}) {
  let isPersisted = persisted
  const storage: Pick<StorageManager, 'persist' | 'persisted'> = {
    persisted: () => Promise.resolve(isPersisted),
    persist: () => {
      if (grantsPersistence) isPersisted = true
      return Promise.resolve(isPersisted)
    },
  }
  Object.defineProperty(navigator, 'storage', { value: storage, configurable: true })
  onTestFinished(() => {
    Reflect.deleteProperty(navigator, 'storage')
  })
}
