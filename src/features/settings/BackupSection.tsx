import { useId, useRef, useState, type ChangeEvent } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useRepositories, type Repositories } from '@/data'
import {
  backupFileName,
  createExportFile,
  formatDateTime,
  parseBackupFile,
  type BackupData,
  type Timestamp,
} from '@/domain'
import { downloadJson } from './downloadFile'

/** 下載目前全部資料的備份檔，並記下上次匯出時間 */
async function exportBackup(repositories: Repositories) {
  const data = await repositories.backup.exportAll()
  const now = new Date()
  const exportedAt = now.toISOString()
  downloadJson(backupFileName(now), createExportFile(data, exportedAt))
  await repositories.settings.update({ lastExportedAt: exportedAt })
}

function LastExportedAt({ value }: { value: Timestamp | null }) {
  const id = useId()
  return (
    <dl className="flex gap-2 text-sm">
      <dt id={id} className="text-muted-foreground">
        上次匯出時間
      </dt>
      <dd aria-labelledby={id}>{value ? formatDateTime(value) : '尚未匯出'}</dd>
    </dl>
  )
}

/**
 * 設定頁的「資料備份」：匯出、匯入與上次匯出時間（PRD US-16、US-17）。
 * 匯入流程：驗證並遷移檔案 → 確認覆蓋 → 自動下載目前資料的備份 → 整份取代。
 * 任一步驟失敗時現有資料不變。
 */
export function BackupSection({ lastExportedAt }: { lastExportedAt: Timestamp | null }) {
  const repositories = useRepositories()
  const titleId = useId()
  const fileInput = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string>()
  // 已通過驗證、等待使用者確認覆蓋的匯入內容
  const [pendingImport, setPendingImport] = useState<BackupData>()

  async function handleExport() {
    setError(undefined)
    try {
      await exportBackup(repositories)
    } catch (cause) {
      console.error('匯出失敗', cause)
      setError('匯出失敗，請再試一次')
    }
  }

  async function handleFileChosen(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // 清空選擇，之後選同一個檔案也會觸發
    event.target.value = ''
    if (!file) return
    setError(undefined)
    const result = parseBackupFile(await file.text())
    if (result.ok) setPendingImport(result.data)
    else setError(`無法匯入：${result.error}`)
  }

  async function handleConfirmImport(data: BackupData) {
    setPendingImport(undefined)
    try {
      await exportBackup(repositories)
      await repositories.backup.replaceAll(data)
      toast.success('匯入完成')
    } catch (cause) {
      console.error('匯入失敗', cause)
      setError('匯入失敗，現有資料未變更')
    }
  }

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <h2 id={titleId} className="font-semibold">
        資料備份
      </h2>
      <LastExportedAt value={lastExportedAt} />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="h-11" onClick={handleExport}>
          匯出資料
        </Button>
        <Button variant="outline" className="h-11" onClick={() => fileInput.current?.click()}>
          匯入資料
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          aria-label="選擇備份檔"
          className="hidden"
          onChange={handleFileChosen}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <AlertDialog
        open={pendingImport !== undefined}
        onOpenChange={(open) => {
          if (!open) setPendingImport(undefined)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>匯入並覆蓋目前的資料？</AlertDialogTitle>
            <AlertDialogDescription>
              匯入將覆蓋目前所有資料，此動作無法復原。系統會先自動下載目前資料的備份。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="h-11"
              onClick={() => pendingImport && handleConfirmImport(pendingImport)}
            >
              匯入
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
