import { CalendarDays, Loader2 } from 'lucide-react'
import { Suspense, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { useMe } from '@/features/auth/use-auth'
import { AppSidebar } from './app-sidebar'
import { NAV_GROUPS } from './nav-items'

export function AppLayout() {
  const { data: user } = useMe()
  const { pathname } = useLocation()
  const group = NAV_GROUPS.find((g) => g.items.some((item) => item.url === pathname))
  const page = group?.items.find((item) => item.url === pathname)
  const [today] = useState(() =>
    new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }),
  )

  if (!user) return null

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 rounded-t-xl border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {group && (
                <>
                  <BreadcrumbItem className="hidden sm:inline-flex">{group.label}</BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden sm:inline-flex" />
                </>
              )}
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium">{page?.title ?? 'VCB Management'}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground md:flex">
              <CalendarDays className="size-3.5" />
              <span className="capitalize">{today}</span>
            </div>
            <ThemeToggle />
          </div>
        </header>
        <div className="flex flex-1 flex-col">
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

function PageFallback() {
  return (
    <div className="flex flex-1 items-center justify-center py-24 text-muted-foreground">
      <Loader2 className="size-5 animate-spin" />
    </div>
  )
}
