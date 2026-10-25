import { Suspense } from 'react'
import { Outlet } from 'react-router'
import { BottomTabBar } from './BottomTabBar'

export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1 px-4 pt-4 pb-20">
        {/* 今天以外的分頁是動態載入的（routes.tsx），載入完成前內容區先留白 */}
        <Suspense>
          <Outlet />
        </Suspense>
      </main>
      <BottomTabBar />
    </div>
  )
}
