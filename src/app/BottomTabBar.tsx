import { CalendarDays, Dumbbell, NotebookPen, Settings } from 'lucide-react'
import { Link, matchPath, useLocation } from 'react-router'
import { cn } from '@/lib/utils'

/** `activeOn`：分頁在哪些路由下呈現選取狀態 */
const tabs = [
  { to: '/', label: '今天', icon: NotebookPen, activeOn: ['/', '/day/*'] },
  { to: '/history', label: '歷史', icon: CalendarDays, activeOn: ['/history/*'] },
  { to: '/exercises', label: '動作庫', icon: Dumbbell, activeOn: ['/exercises/*'] },
  { to: '/settings', label: '設定', icon: Settings, activeOn: ['/settings/*'] },
] as const

export function BottomTabBar() {
  const { pathname } = useLocation()

  return (
    <nav
      aria-label="主要分頁"
      className="fixed inset-x-0 bottom-0 border-t bg-background pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-md">
        {tabs.map(({ to, label, icon: Icon, activeOn }) => {
          const isActive = activeOn.some((pattern) => matchPath(pattern, pathname))
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex min-h-14 min-w-11 flex-col items-center justify-center gap-0.5 text-xs',
                  isActive ? 'font-medium text-foreground' : 'text-muted-foreground',
                )}
              >
                <Icon aria-hidden="true" className="size-5" />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
