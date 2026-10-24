import { useState } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import { useFlushFieldEditsOnHide } from '@/data'
import { routes } from './routes'

export default function App() {
  // 在元件內建立 router，讓每次渲染（含測試）都從當下的網址開始
  const [router] = useState(() =>
    createBrowserRouter(routes, { basename: import.meta.env.BASE_URL }),
  )
  useFlushFieldEditsOnHide()

  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  )
}
