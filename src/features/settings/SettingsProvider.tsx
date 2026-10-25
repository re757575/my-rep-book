import { useEffect, type ReactNode } from 'react'
import { useLiveData } from '@/data'
import type { Theme } from '@/domain'
import { SettingsContext } from './settingsContext'

const DARK_QUERY = '(prefers-color-scheme: dark)'

/**
 * 把主題套用到 `<html>`：深色時加上 `dark` class（Tailwind 的 dark variant 依它切換），
 * 跟隨系統時依 `prefers-color-scheme`，系統切換深淺色時立即跟著變。
 */
function useApplyTheme(theme: Theme) {
  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia(DARK_QUERY)
    function apply() {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      root.classList.toggle('dark', dark)
      root.style.colorScheme = dark ? 'dark' : 'light'
    }
    apply()
    if (theme !== 'system') return
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])
}

/**
 * 讀取設定並提供給整個 App（含設定在其他分頁被修改），同時套用主題。
 * 載入中子元件照常渲染，設定先用預設值。
 */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const settings = useLiveData((repositories) => repositories.settings.get(), [])
  useApplyTheme(settings?.theme ?? 'system')
  return <SettingsContext value={settings}>{children}</SettingsContext>
}
