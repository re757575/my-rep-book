import type { FieldEdit } from '@/domain'

const STORAGE_KEY = 'my-rep-book:pending-field-edits'

/**
 * 待寫入 IndexedDB 的欄位編輯，存在 localStorage。
 * localStorage 是同步寫入的：輸入事件處理完時就已保存，頁面接著被重新整理或關閉也不會遺失；
 * IndexedDB 的 transaction 則會在頁面卸載時被中斷。
 */
export interface PendingFieldEdits {
  read(): FieldEdit[]
  write(edits: readonly FieldEdit[]): void
}

export function createLocalStoragePendingFieldEdits(
  getStorage: () => Storage = () => localStorage,
): PendingFieldEdits {
  // localStorage 無法使用時（例如被瀏覽器設定停用）改存在記憶體：
  // 仍會合併寫入，只是失去「重新整理後補寫」的保證
  let inMemory: FieldEdit[] | undefined

  return {
    read() {
      if (inMemory) return inMemory
      try {
        const parsed: unknown = JSON.parse(getStorage().getItem(STORAGE_KEY) ?? '[]')
        return Array.isArray(parsed) ? (parsed as FieldEdit[]) : []
      } catch {
        return []
      }
    },
    write(edits) {
      if (inMemory) {
        inMemory = [...edits]
        return
      }
      try {
        if (edits.length === 0) getStorage().removeItem(STORAGE_KEY)
        else getStorage().setItem(STORAGE_KEY, JSON.stringify(edits))
      } catch {
        inMemory = [...edits]
      }
    },
  }
}
