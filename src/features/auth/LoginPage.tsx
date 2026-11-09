import { useQueryClient } from '@tanstack/react-query'
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

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname || '/'

  useEffect(() => {
    const error = searchParams.get('error')
    const oauthOk = searchParams.get('oauth') === 'ok'
    if (!error && !oauthOk) return
    if (oauthOk) {
      toast.success('Đăng nhập thành công', { id: 'oauth-result' })
      void queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY })
    } else {
      toast.error(error, { id: 'oauth-result' })
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
            toast.success('Đăng nhập thành công')
            navigate(from, { replace: true })
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
    <div className="grid min-h-dvh min-h-[100dvh] bg-[#f7f7fb] lg:grid-cols-[1.1fr_1fr] lg:bg-background">
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

      <main className="relative flex min-h-dvh min-h-[100dvh] flex-col bg-[#f7f7fb] px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:items-center lg:justify-center lg:bg-background lg:px-6 lg:py-12">
        <div className="flex justify-end gap-1 lg:absolute lg:top-4 lg:right-4">
          <InstallAppButton className="size-11" />
          <ThemeToggle className="size-11" />
        </div>

        <div className="mx-auto w-full max-w-sm pt-6 lg:pt-0">
          <div className="mb-8 flex flex-col items-center gap-3 text-center lg:items-start lg:text-left">
            <BrandMark className="size-12 rounded-2xl lg:hidden" />
            <div className="space-y-1.5">
              <h1 className="text-[1.65rem] leading-tight font-semibold tracking-tight text-zinc-900">
                Chào mừng trở lại
              </h1>
              <p className="text-sm text-zinc-500">Đăng nhập bằng tài khoản được cấp để tiếp tục.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200/80 lg:bg-transparent lg:p-0 lg:shadow-none lg:ring-0">
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
                    className="h-12 border-zinc-200 bg-white pl-9 text-base text-zinc-900"
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
                    className="h-12 border-zinc-200 bg-white pr-12 pl-9 text-base text-zinc-900"
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
                disabled={login.isPending}
                className="h-12 w-full bg-[#4f46e5] bg-clip-border text-base text-white hover:bg-[#4338ca] disabled:opacity-70"
                style={{ backgroundColor: '#4f46e5', color: '#fff' }}
              >
                {login.isPending && <Loader2 className="animate-spin" />}
                {login.isPending ? 'Đang đăng nhập…' : 'Đăng nhập'}
              </Button>
            </FieldGroup>
          </form>

          <p className="mt-6 text-center text-xs text-zinc-500 lg:text-left">
            Chưa có tài khoản? Liên hệ quản trị viên để được cấp quyền truy cập.
          </p>
        </div>
      </main>
    </div>
  )
}
