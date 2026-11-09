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
import { InstallAppButton } from './install-app-button'
import { InstallHint } from './install-hint'
import { MobileTabBar } from './mobile-tab-bar'
import { NAV_GROUPS } from './nav-items'

export function AppLayout() {
  const { data: user } = useMe()
  const { pathname } = useLocation()
  const group = NAV_GROUPS.find((g) => g.items.some((item) => item.url === pathname))
  const page = group?.items.find((item) => item.url === pathname)
  const [today] = useState(() =>
    new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }),
  )

  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-6 text-sm text-muted-foreground">
        Đang tải…
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header
          className="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b bg-white px-3 md:px-4"
          style={{ height: 'calc(3.5rem + env(safe-area-inset-top, 0px))', paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <SidebarTrigger className="size-11 shrink-0 md:size-8" />
          <Separator orientation="vertical" className="mr-1 hidden h-4 sm:block" />
          <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-zinc-900 md:hidden">
            {page?.title ?? 'VCB Management'}
          </p>
          <Breadcrumb className="hidden min-w-0 md:block">
            <BreadcrumbList>
              {group && (
                <>
                  <BreadcrumbItem className="hidden sm:inline-flex">{group.label}</BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden sm:inline-flex" />
                </>
              )}
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium text-zinc-900">{page?.title ?? 'VCB Management'}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex shrink-0 items-center gap-1">
            <div className="hidden items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground md:flex">
              <CalendarDays className="size-3.5" />
              <span className="capitalize">{today}</span>
            </div>
            <InstallAppButton />
            <ThemeToggle />
          </div>
        </header>
        <div className="flex flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
          <div className="px-4 pt-3 md:hidden">
            <InstallHint />
          </div>
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </SidebarInset>
      <MobileTabBar />
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
