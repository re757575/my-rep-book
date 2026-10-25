/**
 * 頁面載入完成、主執行緒閒置後才執行 `callback`，回傳取消函式。
 *
 * 用來延後不影響首次畫面的工作（註冊 Service Worker、預先載入動態 chunk），
 * 不和首頁需要的資源搶頻寬與主執行緒，拖慢 LCP（PRD §7）。
 */
export function whenIdleAfterLoad(callback: () => void): () => void {
  let cancelIdle = () => {}
  const waitForIdle = () => {
    // Safari 沒有 requestIdleCallback，改用 setTimeout
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(callback, { timeout: 2000 })
      cancelIdle = () => cancelIdleCallback(id)
    } else {
      const id = setTimeout(callback, 500)
      cancelIdle = () => clearTimeout(id)
    }
  }
  if (document.readyState === 'complete') waitForIdle()
  else window.addEventListener('load', waitForIdle, { once: true })
  return () => {
    window.removeEventListener('load', waitForIdle)
    cancelIdle()
  }
}
