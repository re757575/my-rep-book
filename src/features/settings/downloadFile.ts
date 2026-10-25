/** 讓瀏覽器下載一個 JSON 檔 */
export function downloadJson(fileName: string, content: unknown) {
  const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  // 部分瀏覽器（例如 Firefox）只會下載已加入文件的連結
  document.body.append(link)
  link.click()
  link.remove()
  // 立刻釋放時 iOS Safari 可能還沒開始下載，稍後再釋放
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
