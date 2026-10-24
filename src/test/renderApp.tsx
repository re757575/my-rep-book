import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/app/App'
import { db } from '@/data/dexie/db'

/**
 * 接縫 A：渲染整個 App。
 *
 * @param route App 內的路徑（不含 base path），例如 `/`、`/settings`、`/day/2026-10-20`
 * @returns `user`（user-event）、RTL render 結果，以及 `reload()`：模擬重新整理頁面
 */
export function renderApp(route = '/') {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  window.history.pushState({}, '', `${base}${route}`)

  const user = userEvent.setup()
  const result = render(<App />)

  /**
   * 模擬重新整理：卸載 App、關閉資料庫連線，再從目前的網址重新渲染。
   * IndexedDB 的內容保留，只有記憶體中的狀態消失。
   */
  function reload() {
    const currentRoute = window.location.pathname.slice(base.length) || '/'
    result.unmount()
    db.close({ disableAutoOpen: false })
    return renderApp(currentRoute)
  }

  return { user, reload, ...result }
}
