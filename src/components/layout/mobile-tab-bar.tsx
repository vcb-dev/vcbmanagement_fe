import { NavLink } from 'react-router-dom'
import { useMe } from '@/features/auth/use-auth'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from './nav-items'

const TAB_URLS = ['/', '/attendance', '/face', '/assistant'] as const

export function MobileTabBar() {
  const { data: user } = useMe()
  const tabs = NAV_ITEMS.filter((item) => TAB_URLS.includes(item.url as (typeof TAB_URLS)[number])).filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  )

  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid h-14 grid-cols-4">
        {tabs.map((item) => (
          <li key={item.url}>
            <NavLink
              to={item.url}
              className={({ isActive }) =>
                cn(
                  'flex h-14 min-h-11 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )
              }
            >
              <item.icon className="size-5" />
              {item.title}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
