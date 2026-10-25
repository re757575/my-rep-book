import { useState } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import { useFlushFieldEditsOnHide } from '@/data'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import { useSettings } from '@/features/settings/settingsContext'
import { routes } from './routes'

export default function App() {
  // 在元件內建立 router，讓每次渲染（含測試）都從當下的網址開始
  const [router] = useState(() =>
    createBrowserRouter(routes, { basename: import.meta.env.BASE_URL }),
  )
  useFlushFieldEditsOnHide()

  return (
    <SettingsProvider>
      <RouterProvider router={router} />
      <ThemedToaster />
    </SettingsProvider>
  )
}

/** toast 跟著使用者選的主題 */
function ThemedToaster() {
  const { theme } = useSettings()
  return <Toaster theme={theme} />
}
