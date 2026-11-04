import {
  AlarmClock,
  ArrowRight,
  CalendarCheck2,
  CalendarClock,
  Hourglass,
  Sparkles,
  Target,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { AttendanceStatus } from '@/features/attendance/AttendanceStatus'
import { ClockCard } from '@/features/attendance/ClockCard'
import { useAttendanceDaily, useAttendanceRecent } from '@/features/attendance/use-attendance'
import { WorkHoursChart } from '@/features/attendance/WorkHoursChart'
import { useMe } from '@/features/auth/use-auth'
import { formatDuration, formatTime, formatWorkDate, todayYmd } from '@/lib/format'
import { displayName } from '@/lib/user-display'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 11) return 'Chào buổi sáng'
  if (h < 14) return 'Chào buổi trưa'
  if (h < 18) return 'Chào buổi chiều'
  return 'Chào buổi tối'
}

export function DashboardPage() {
  const { data: user } = useMe()
  const { data: recent, isPending } = useAttendanceRecent(30)
  const isManager = user?.role === 'admin' || user?.role === 'manager'

  if (!user) return null

  const s = recent?.summary
  const shiftsIn = recent?.records.reduce((n, r) => n + Number(!!r.morning.inAt) + Number(!!r.afternoon.inAt), 0) ?? 0
  const onTimeRate = shiftsIn > 0 ? Math.round(((shiftsIn - (s?.lateCount ?? 0)) / shiftsIn) * 100) : null

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader
        title={
          <>
            {greeting()}, <span className="text-primary">{displayName(user)}</span> 👋
          </>
        }
        description="Tình hình làm việc của bạn trong 30 ngày gần nhất."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/attendance">
                <CalendarClock />
                Bảng công
              </Link>
            </Button>
            <Button asChild>
              <Link to="/assistant">
                <Sparkles />
                Hỏi trợ lý AI
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={CalendarCheck2}
          label="Ngày công"
          value={s ? `${s.workDays} ngày` : '—'}
          hint="Số ngày có chấm công"
          tone="indigo"
          loading={isPending}
        />
        <StatCard
          icon={Hourglass}
          label="Tổng giờ làm"
          value={formatDuration(s?.totalWorkedMinutes)}
          hint={s && s.workDays > 0 ? `TB ${formatDuration(Math.round(s.totalWorkedMinutes / s.workDays))} / ngày` : 'Chưa có dữ liệu'}
          tone="emerald"
          loading={isPending}
        />
        <StatCard
          icon={AlarmClock}
          label="Đi muộn"
          value={s ? `${s.lateCount} lần` : '—'}
          hint={s ? `Tổng ${formatDuration(s.totalLateMinutes)}` : undefined}
          tone="amber"
          loading={isPending}
        />
        <StatCard
          icon={Target}
          label="Tỷ lệ đúng giờ"
          value={onTimeRate === null ? '—' : `${onTimeRate}%`}
          hint={onTimeRate === null ? 'Chưa có dữ liệu' : onTimeRate >= 90 ? 'Rất tốt, tiếp tục phát huy!' : 'Cố gắng đến đúng giờ hơn nhé'}
          tone="violet"
          loading={isPending}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <ClockCard />
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Giờ làm việc</CardTitle>
            <CardDescription>14 ngày làm việc gần nhất · vạch đứt là mốc 8 giờ</CardDescription>
            <CardAction className="flex items-center gap-3 text-xs text-muted-foreground">
              <Legend color="var(--chart-1)" label="Đúng giờ" />
              <Legend color="var(--chart-3)" label="Đi muộn" />
            </CardAction>
          </CardHeader>
          <CardContent className="flex-1">
            {isPending ? <Skeleton className="h-56 w-full" /> : <WorkHoursChart records={recent?.records ?? []} />}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Chấm công gần đây</CardTitle>
            <CardDescription>Các ngày làm việc mới nhất của bạn</CardDescription>
            <CardAction>
              <Button asChild variant="ghost" size="sm">
                <Link to="/attendance">
                  Xem tất cả
                  <ArrowRight />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {isPending ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : recent && recent.records.length > 0 ? (
              <ul className="divide-y">
                {recent.records.slice(0, 6).map((r) => (
                  <li key={r.id} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                    <DateBadge ymd={r.workDate} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium tabular-nums">
                        <span className="text-muted-foreground">S</span> {formatTime(r.morning.inAt)}–
                        {formatTime(r.morning.outAt)}
                        <span className="mx-1.5 text-muted-foreground">·</span>
                        <span className="text-muted-foreground">C</span> {formatTime(r.afternoon.inAt)}–
                        {formatTime(r.afternoon.outAt)}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatWorkDate(r.workDate, { long: true })}</p>
                    </div>
                    <span className="hidden text-sm font-medium tabular-nums sm:block">
                      {formatDuration(r.workedMinutes)}
                    </span>
                    <AttendanceStatus record={r} live={r.workDate === todayYmd()} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {isManager && <TeamTodayCard />}
          <Card>
            <CardHeader>
              <CardTitle>Truy cập nhanh</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <QuickLink
                to="/attendance"
                icon={CalendarClock}
                title="Chấm công"
                desc="Vào ca, ra ca và xem bảng công"
                className="from-indigo-500 to-blue-500 shadow-indigo-500/25"
              />
              {isManager && (
                <QuickLink
                  to="/face/review"
                  icon={ShieldCheck}
                  title="Duyệt khuôn mặt"
                  desc="Xem ảnh đăng ký rồi duyệt hoặc từ chối"
                  className="from-emerald-500 to-teal-500 shadow-emerald-500/25"
                />
              )}
              <QuickLink
                to="/assistant"
                icon={Sparkles}
                title="Trợ lý AI"
                desc="Hỏi đáp, soạn thảo nhanh"
                className="from-violet-500 to-fuchsia-500 shadow-violet-500/25"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function TeamTodayCard() {
  const { data, isPending } = useAttendanceDaily(todayYmd())
  const s = data?.summary
  const rate = s && s.total > 0 ? Math.round((s.present / s.total) * 100) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nhân sự hôm nay</CardTitle>
        <CardDescription>Tình hình chấm công toàn công ty</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPending || !s ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <div>
              <div className="mb-2 flex items-end justify-between">
                <span className="text-3xl font-semibold tabular-nums">
                  {s.present}
                  <span className="text-base font-normal text-muted-foreground">/{s.total}</span>
                </span>
                <span className="text-sm font-medium text-muted-foreground">{rate}% có mặt</span>
              </div>
              <Progress value={rate} className="h-2" />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <MiniStat icon={UserCheck} value={s.present - s.late} label="Đúng giờ" className="text-emerald-600 dark:text-emerald-400" />
              <MiniStat icon={AlarmClock} value={s.late} label="Đi muộn" className="text-amber-600 dark:text-amber-400" />
              <MiniStat icon={UserX} value={s.absent} label="Chưa chấm" className="text-muted-foreground" />
            </div>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/attendance?tab=team">
                <Users />
                Xem bảng công nhân viên
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function MiniStat({
  icon: Icon,
  value,
  label,
  className,
}: {
  icon: typeof Users
  value: number
  label: string
  className?: string
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-2">
      <Icon className={`mx-auto size-4 ${className}`} />
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}

function QuickLink({
  to,
  icon: Icon,
  title,
  desc,
  className,
}: {
  to: string
  icon: typeof Users
  title: string
  desc: string
  className: string
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/50"
    >
      <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-md ${className}`}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{desc}</p>
      </div>
      <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}

function DateBadge({ ymd }: { ymd: string }) {
  const d = new Date(`${ymd}T00:00:00`)
  return (
    <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg border bg-muted/40 leading-none">
      <span className="text-[10px] font-medium text-muted-foreground uppercase">
        {d.toLocaleDateString('vi-VN', { weekday: 'short' })}
      </span>
      <span className="mt-0.5 text-base font-semibold tabular-nums">{d.getDate()}</span>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="size-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <CalendarClock className="size-8 text-muted-foreground/60" />
      <p className="text-sm font-medium">Chưa có dữ liệu chấm công</p>
      <p className="text-xs text-muted-foreground">Bấm “Chấm công vào” để bắt đầu ngày làm việc.</p>
    </div>
  )
}
