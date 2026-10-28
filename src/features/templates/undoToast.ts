import { toast } from 'sonner'

/** 可以「復原」的時間（毫秒），同刪除（`deleteWithUndo`） */
const UNDO_DURATION_MS = 5000

/** 顯示附「復原」按鈕的 toast（US-41、US-42） */
export function showUndoToast(message: string, undo: () => Promise<void>) {
  toast(message, {
    duration: UNDO_DURATION_MS,
    action: { label: '復原', onClick: () => void undo() },
  })
}
