import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BarChart3, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BrandMark } from '@/components/brand-logo'
import { InstallAppButton } from '@/components/layout/install-app-button'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { getApiErrorMessage } from '@/lib/api-client'
import { authApi } from './auth.api'
import { ME_QUERY_KEY, markLoggedOut, useLogin, useMe } from './use-auth'

const GOOGLE_ERROR: Record<string, string> = {
  google_email: 'Email Google này chưa có tài khoản. Dùng đúng email đã được cấp, hoặc đăng nhập bằng mật khẩu.',
  google_unverified: 'Email Google chưa được xác minh.',
  google_locked: 'Tài khoản đã bị khóa.',
  google_cancel: 'Bạn đã hủy đăng nhập Google.',
  google_code: 'Thiếu mã xác thực từ Google. Hãy thử lại.',
  google_state: 'Phiên đăng nhập Google hết hạn. Hãy bấm Đăng nhập với Google lại.',
  google_failed: 'Đăng nhập Google thất bại. Hãy thử lại.',
}

const HIGHLIGHTS = [
  { icon: Users, title: 'Quản lý tập trung', desc: 'Nhân sự, khách hàng và vận hành trên một nền tảng.' },
  { icon: Sparkles, title: 'Trợ lý AI', desc: 'Hỏi đáp, tổng hợp và gợi ý dựa trên dữ liệu nội bộ.' },
  { icon: BarChart3, title: 'Báo cáo trực quan', desc: 'Theo dõi số liệu và hiệu quả theo thời gian thực.' },
]

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const queryClient = useQueryClient()
  const me = useMe()
  const login = useLogin()
  const providers = useQuery({
    queryKey: ['auth', 'providers'],
    queryFn: authApi.providers,
    staleTime: 5 * 60_000,
    retry: 0,
  })
  const [googlePending, setGooglePending] = useState(false)

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname || '/'

  useEffect(() => {
    const error = searchParams.get('error')
    const oauthOk = searchParams.get('oauth') === 'ok'
    if (!error && !oauthOk) return
    if (oauthOk) {
      void (async () => {
        try {
          const user = await authApi.me()
          queryClient.setQueryData(ME_QUERY_KEY, user)
          toast.success('Đăng nhập thành công', { id: 'oauth-result' })
        } catch {
          toast.error('Google xác thực xong nhưng chưa giữ được phiên. Hãy thử lại.', { id: 'oauth-result' })
        }
      })()
    } else {
      toast.error(GOOGLE_ERROR[error] ?? error, { id: 'oauth-result' })
    }
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams, queryClient])

  if (me.data) return <Navigate to={from} replace />

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    login.mutate(
      { email: email.trim(), password },
      {
        onSuccess: async (user) => {
          queryClient.setQueryData(ME_QUERY_KEY, user)
          try {
            const confirmed = await authApi.me()
            queryClient.setQueryData(ME_QUERY_KEY, confirmed)
            navigate(from, { replace: true })
            window.setTimeout(() => toast.success('Đăng nhập thành công'), 80)
          } catch {
            markLoggedOut(queryClient)
            toast.error('Không giữ được phiên trên điện thoại. Thử lại sau vài giây.')
          }
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    )
  }

  return (
    <div className="grid min-h-dvh min-h-[100dvh] overflow-x-clip bg-background lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-zinc-950 text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-32 size-[28rem] rounded-full bg-indigo-600/40 blur-3xl" />
          <div className="absolute -right-24 -bottom-40 size-[32rem] rounded-full bg-violet-600/30 blur-3xl" />
        </div>

        <div className="relative flex items-center gap-3">
          <BrandMark />
          <div>
            <p className="text-[11px] font-semibold tracking-[0.22em] text-indigo-300 uppercase">
              Viên Chi Bảo
            </p>
            <p className="font-semibold">VCB Management</p>
          </div>
        </div>

        <div className="relative max-w-md space-y-8">
          <h2 className="text-4xl leading-tight font-bold tracking-tight">
            Vận hành doanh nghiệp
            <span className="mt-1 block text-indigo-300">gọn gàng và thông minh</span>
          </h2>
          <ul className="space-y-5">
            {HIGHLIGHTS.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <Icon className="size-5 text-indigo-200" />
                </div>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-zinc-400">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative flex items-center gap-2 text-xs text-zinc-500">
          <ShieldCheck className="size-3.5" />
          Phiên đăng nhập được bảo vệ bằng cookie HttpOnly
        </p>
      </aside>

      <main className="relative flex min-h-dvh min-h-[100dvh] flex-col bg-background px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:items-center lg:justify-center lg:px-6 lg:py-12">
        <div className="flex justify-end gap-1 lg:absolute lg:top-4 lg:right-4">
          <InstallAppButton className="size-11" />
          <ThemeToggle className="size-11" />
        </div>

        <div className="mx-auto w-full max-w-sm pt-6 lg:pt-0">
          <div className="mb-8 flex flex-col items-center gap-3 text-center lg:items-start lg:text-left">
            <BrandMark className="size-12 rounded-2xl lg:hidden" />
            <div className="space-y-1.5">
              <h1 className="text-[1.65rem] leading-tight font-semibold tracking-tight text-foreground">
                Chào mừng trở lại
              </h1>
              <p className="text-sm text-muted-foreground">Đăng nhập bằng tài khoản được cấp để tiếp tục.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="rounded-2xl bg-card p-5 text-card-foreground shadow-sm ring-1 ring-border lg:bg-transparent lg:p-0 lg:shadow-none lg:ring-0">
            <FieldGroup className="gap-5">
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    required
                    autoComplete="username"
                    placeholder="ban@vcb.vn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 bg-background pl-9 text-base text-foreground"
                  />
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Mật khẩu</FieldLabel>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 bg-background pr-12 pl-9 text-base text-foreground"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 right-1 size-10 -translate-y-1/2 text-zinc-500"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
              </Field>

              <Button
                type="submit"
                disabled={login.isPending || googlePending}
                className="h-12 w-full bg-[#4f46e5] bg-clip-border text-base text-white hover:bg-[#4338ca] disabled:opacity-70"
                style={{ backgroundColor: '#4f46e5', color: '#fff' }}
              >
                {login.isPending && <Loader2 className="animate-spin" />}
                {login.isPending ? 'Đang đăng nhập…' : 'Đăng nhập'}
              </Button>
            </FieldGroup>
          </form>

          {providers.data?.google && (
            <div className="mt-5 space-y-5">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                hoặc
                <span className="h-px flex-1 bg-border" />
              </div>
              <Button
                type="button"
                variant="outline"
                disabled={login.isPending || googlePending}
                className="h-12 w-full bg-background text-base text-foreground"
                onClick={() => {
                  setGooglePending(true)
                  window.location.assign(authApi.googleLoginUrl())
                }}
              >
                {googlePending ? <Loader2 className="animate-spin" /> : <GoogleMark />}
                Đăng nhập với Google
              </Button>
            </div>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground lg:text-left">
            Chưa có tài khoản? Liên hệ quản trị viên để được cấp quyền truy cập. Google chỉ nhận email đã có trong hệ thống.
          </p>
        </div>
      </main>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.82-.07-1.64-.23-2.43H12v4.6h6.46a5.52 5.52 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.55-5.17 3.55-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.93l-3.88-3c-1.08.72-2.47 1.14-4.07 1.14-3.13 0-5.78-2.11-6.73-4.96H1.27v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.25A7.2 7.2 0 0 1 4.89 12c0-.78.14-1.53.38-2.25V6.66H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.34l4-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.45-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.66l4 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  )
}
