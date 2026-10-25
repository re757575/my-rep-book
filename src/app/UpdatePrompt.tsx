import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { whenIdleAfterLoad } from '@/lib/whenIdleAfterLoad'

/** App 一直開著時（例如整場訓練都沒關），每小時檢查一次有沒有新版本 */
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000

/**
 * 註冊 Service Worker 並在有新版本時提示（US-20）。
 *
 * 等頁面載入完成、主執行緒閒置後才註冊：註冊時要動態載入 workbox-window，Service Worker 也會開始
 * 下載預先快取的所有檔案，太早開始會拖慢 LCP（PRD §7）。
 */
export function UpdatePrompt() {
  const [idle, setIdle] = useState(false)

  useEffect(() => whenIdleAfterLoad(() => setIdle(true)), [])

  return idle ? <RegisterServiceWorker /> : null
}

/**
 * 有新版本時顯示「有新版本」toast，使用者按「重新整理」才換成新版本，避免記錄到一半被強制重新載入。
 *
 * 開發模式與測試中 vite-plugin-pwa 提供的是什麼都不做的版本，不會註冊。
 */
function RegisterServiceWorker() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      setInterval(() => {
        if (navigator.onLine) registration.update().catch(() => {})
      }, UPDATE_CHECK_INTERVAL_MS)
    },
    onRegisterError(error) {
      console.error('註冊 Service Worker 失敗', error)
    },
  })

  useEffect(() => {
    if (!needRefresh) return
    const id = toast('有新版本', {
      duration: Infinity,
      action: { label: '重新整理', onClick: () => void updateServiceWorker() },
    })
    return () => {
      toast.dismiss(id)
    }
  }, [needRefresh, updateServiceWorker])

  return null
}
