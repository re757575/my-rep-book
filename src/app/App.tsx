import { useState } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import { useFlushFieldEditsOnHide } from '@/data'
import { PersistentStorageProvider } from '@/features/settings/PersistentStorageProvider'
import { SettingsProvider } from '@/features/settings/SettingsProvider'
import { useSettings } from '@/features/settings/settingsContext'
import { routes } from './routes'
import { UpdatePrompt } from './UpdatePrompt'

export default function App() {
  // 在元件內建立 router，讓每次渲染（含測試）都從當下的網址開始
  const [router] = useState(() =>
    createBrowserRouter(routes, { basename: import.meta.env.BASE_URL }),
  )
  useFlushFieldEditsOnHide()

  return (
    <SettingsProvider>
      <PersistentStorageProvider>
        <RouterProvider router={router} />
      </PersistentStorageProvider>
      <ThemedToaster />
      <UpdatePrompt />
    </SettingsProvider>
  )
}

/** toast 跟著使用者選的主題 */
function ThemedToaster() {
  const { theme } = useSettings()
  return <Toaster theme={theme} />
}
