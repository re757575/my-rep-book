/** 「重量新紀錄」「1RM 新紀錄」標示；動作歷史與訓練頁共用 */
export function RecordBadge({ children }: { children: string }) {
  return (
    <span className="rounded-sm bg-primary px-1.5 text-xs text-primary-foreground">{children}</span>
  )
}
