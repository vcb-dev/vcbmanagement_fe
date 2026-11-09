import { Loader2, ShieldAlert, WifiOff } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { BrandMark } from '@/components/brand-logo'
import { Button } from '@/components/ui/button'
import type { UserRole } from './auth.types'
import { useMe } from './use-auth'

interface Props {
  roles?: UserRole[]
}

export function ProtectedRoute({ roles }: Props) {
  const location = useLocation()
  const { data: user, isPending, isError, refetch, isRefetching } = useMe()

  if (isPending) {
    return (
      <FullScreen>
        <BrandMark className="size-12 animate-pulse rounded-2xl" />
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Đang xác thực phiên đăng nhập…
        </p>
      </FullScreen>
    )
  }

  if (isError) {
    return (
      <FullScreen>
        <div className="flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <WifiOff className="size-6" />
        </div>
        <div className="space-y-1 text-center">
          <p className="font-medium">Không kết nối được máy chủ</p>
          <p className="text-sm text-muted-foreground">Kiểm tra kết nối mạng hoặc thử lại sau.</p>
        </div>
        <Button onClick={() => refetch()} disabled={isRefetching}>
          {isRefetching && <Loader2 className="animate-spin" />}
          Thử lại
        </Button>
      </FullScreen>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <FullScreen>
        <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
          <ShieldAlert className="size-6" />
        </div>
        <p className="text-sm text-muted-foreground">Bạn không có quyền truy cập trang này.</p>
      </FullScreen>
    )
  }

  return <Outlet />
}

function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh min-h-[100dvh] flex-col items-center justify-center gap-4 bg-white p-6 text-zinc-800">
      {children}
    </div>
  )
}
