import { useQueryClient } from '@tanstack/react-query'
import { BarChart3, Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, Sparkles, Users } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { BrandMark } from '@/components/brand-logo'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { getApiErrorMessage } from '@/lib/api-client'
import { ME_QUERY_KEY, useLogin, useMe } from './use-auth'

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

  // BE redirect về /login?oauth=ok (cookie đã set) hoặc /login?error=... sau Google OAuth.
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
        onSuccess: () => {
          toast.success('Đăng nhập thành công')
          navigate(from, { replace: true })
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    )
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-zinc-950 text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -left-32 size-[28rem] rounded-full bg-indigo-600/40 blur-3xl" />
          <div className="absolute -right-24 -bottom-40 size-[32rem] rounded-full bg-violet-600/30 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
              backgroundSize: '44px 44px',
              maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 75%)',
            }}
          />
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
            <span className="block bg-gradient-to-r from-indigo-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
              gọn gàng & thông minh
            </span>
          </h2>
          <ul className="space-y-5">
            {HIGHLIGHTS.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 backdrop-blur">
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
          Phiên đăng nhập được bảo vệ bằng cookie HttpOnly & CSRF token
        </p>
      </aside>

      {/* Form */}
      <main className="relative flex flex-col items-center justify-center bg-background px-6 py-12">
        <ThemeToggle className="absolute top-4 right-4" />

        <div className="w-full max-w-sm animate-in duration-500 fade-in slide-in-from-bottom-4">
          <div className="mb-8 flex flex-col items-center gap-3 text-center lg:items-start lg:text-left">
            <BrandMark className="lg:hidden" />
            <div className="space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight">Chào mừng trở lại 👋</h1>
              <p className="text-sm text-muted-foreground">
                Đăng nhập bằng tài khoản được cấp để tiếp tục.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <FieldGroup className="gap-5">
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    autoComplete="username"
                    placeholder="ban@vcb.vn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 pl-9"
                  />
                </div>
              </Field>

              <Field>
                <FieldLabel htmlFor="password">Mật khẩu</FieldLabel>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10 pl-9"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground"
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
                className="h-12 w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-base text-white shadow-md shadow-indigo-500/25 hover:from-indigo-500 hover:to-violet-500"
              >
                {login.isPending && <Loader2 className="animate-spin" />}
                {login.isPending ? 'Đang đăng nhập…' : 'Đăng nhập'}
              </Button>
            </FieldGroup>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground lg:text-left">
            Chưa có tài khoản? Liên hệ quản trị viên để được cấp quyền truy cập.
          </p>
        </div>
      </main>
    </div>
  )
}
