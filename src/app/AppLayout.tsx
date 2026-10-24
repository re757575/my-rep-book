import { Outlet } from 'react-router'
import { BottomTabBar } from './BottomTabBar'

export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1 px-4 pt-4 pb-20">
        <Outlet />
      </main>
      <BottomTabBar />
    </div>
  )
}
