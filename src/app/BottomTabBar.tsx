import { CalendarDays, Dumbbell, NotebookPen, Settings } from 'lucide-react'
import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'

const tabs = [
  { to: '/', label: '今天', icon: NotebookPen, end: true },
  { to: '/history', label: '歷史', icon: CalendarDays, end: false },
  { to: '/exercises', label: '動作庫', icon: Dumbbell, end: false },
  { to: '/settings', label: '設定', icon: Settings, end: false },
] as const

export function BottomTabBar() {
  return (
    <nav
      aria-label="主要分頁"
      className="fixed inset-x-0 bottom-0 border-t bg-background pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-md">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-14 min-w-11 flex-col items-center justify-center gap-0.5 text-xs',
                  isActive ? 'font-medium text-foreground' : 'text-muted-foreground',
                )
              }
            >
              <Icon aria-hidden="true" className="size-5" />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
