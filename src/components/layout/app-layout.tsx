import { CalendarDays, Loader2, Menu } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { SidebarInset, SidebarProvider, useSidebar } from '@/components/ui/sidebar'
import { useMe } from '@/features/auth/use-auth'
import { AppSidebar } from './app-sidebar'
import { InstallAppButton } from './install-app-button'
import { InstallHint } from './install-hint'
import { NAV_GROUPS } from './nav-items'

export function AppLayout() {
  const { data: user } = useMe()
  const { pathname } = useLocation()
  const group = NAV_GROUPS.find((g) => g.items.some((item) => item.url === pathname))
  const page = group?.items.find((item) => item.url === pathname)
  const [today] = useState(() =>
    new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }),
  )
  // Máy tính bảng (768–1023px): sidebar mở sẵn dạng biểu tượng để nội dung đủ rộng; vẫn mở rộng được bằng nút.
  const [sidebarOpen] = useState(() => typeof window === 'undefined' || window.innerWidth >= 1024)

  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-6 text-sm text-muted-foreground">
        Đang tải…
      </div>
    )
  }

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      {/* Điểm dừng Tab đầu tiên, trước cả menu bên. */}
      <a
        href="#main"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Bỏ qua tới nội dung
      </a>
      <AppSidebar user={user} />
      <SidebarInset className="min-w-0 overflow-x-clip">
        <header
          className="sticky top-0 z-10 flex shrink-0 items-center gap-1 border-b bg-background pr-1 pl-1 md:gap-2 md:px-4"
          style={{ height: 'calc(3.5rem + env(safe-area-inset-top, 0px))', paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <MenuButton />
          {/* Màn rộng đã có breadcrumb nên tiêu đề chỉ ẩn khỏi mắt, vẫn là h1 cho trình đọc màn hình. */}
          <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-foreground md:sr-only">
            {page?.title ?? 'VCB Management'}
          </h1>
          <Breadcrumb className="hidden min-w-0 flex-1 md:block">
            <BreadcrumbList className="flex-nowrap">
              {group && (
                <>
                  <BreadcrumbItem className="shrink-0">{group.label}</BreadcrumbItem>
                  <BreadcrumbSeparator className="shrink-0" />
                </>
              )}
              <BreadcrumbItem className="min-w-0">
                <BreadcrumbPage className="truncate font-medium text-foreground">{page?.title ?? 'VCB Management'}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex shrink-0 items-center md:gap-1">
            <div className="mr-1 hidden items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs whitespace-nowrap text-muted-foreground lg:flex">
              <CalendarDays className="size-3.5" />
              <span className="capitalize">{today}</span>
            </div>
            <InstallAppButton />
            <ThemeToggle className="size-11 md:size-8" />
          </div>
        </header>
        <div id="main" tabIndex={-1} className="flex flex-1 flex-col pb-[env(safe-area-inset-bottom)] outline-none md:pb-0">
          <div className="px-4 pt-3 md:hidden">
            <InstallHint />
          </div>
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

/**
 * Hamburger mở menu bên trái, chỉ trên điện thoại: menu trượt ra che nội dung (lối điều hướng duy nhất).
 * Màn rộng không có nút này; nút thu / mở rộng menu nằm trong chính menu (`AppSidebar`).
 */
function MenuButton() {
  const { setOpenMobile, openMobile } = useSidebar()
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-11 shrink-0 md:hidden"
      onClick={() => setOpenMobile(true)}
      aria-label="Mở menu"
      aria-expanded={openMobile}
    >
      <Menu className="size-5" />
    </Button>
  )
}

function PageFallback() {
  return (
    <div className="flex flex-1 items-center justify-center py-24 text-muted-foreground">
      <Loader2 className="size-5 animate-spin" />
    </div>
  )
}
