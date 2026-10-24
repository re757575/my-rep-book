import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '@/app/App'

/**
 * 接縫 A：渲染整個 App。
 *
 * @param route App 內的路徑（不含 base path），例如 `/`、`/settings`、`/day/2026-10-20`
 */
export function renderApp(route = '/') {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  window.history.pushState({}, '', `${base}${route}`)

  const user = userEvent.setup()
  return { user, ...render(<App />) }
}
