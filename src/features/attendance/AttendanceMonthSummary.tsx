import { AlarmClock, CalendarCheck2, Hourglass, LogOut } from 'lucide-react'
import { MonthNav } from '@/components/month-nav'
import { StatCard } from '@/components/stat-card'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useAttendanceMonth } from '@/features/attendance/use-attendance'
import { formatDuration, formatMonth } from '@/lib/format'

/** Tổng hợp chấm công của tháng đang xem: ngày công, giờ làm, đi muộn, về sớm. */
export function AttendanceMonthSummary({
  month,
  maxMonth,
  onMonthChange,
}: {
  month: string
  maxMonth: string
  onMonthChange: (month: string) => void
}) {
  const { data, isPending } = useAttendanceMonth(month)
  const summary = data?.summary
  const shiftsIn = data?.records.reduce((n, r) => n + Number(!!r.morning.inAt) + Number(!!r.afternoon.inAt), 0) ?? 0
  const onTimeShifts = shiftsIn - (summary?.lateCount ?? 0)
  const onTimeRate = shiftsIn > 0 ? Math.round((onTimeShifts / shiftsIn) * 100) : null

  return (
    <Card>
      <CardHeader className="max-sm:grid-cols-1">
        <CardTitle>Tổng hợp {formatMonth(month).toLowerCase()}</CardTitle>
        <CardDescription>Số liệu chấm công của bạn trong tháng</CardDescription>
        <CardAction className="max-sm:col-start-1 max-sm:row-auto max-sm:justify-self-start">
          <MonthNav month={month} max={maxMonth} onChange={onMonthChange} className="hidden sm:flex" />
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={CalendarCheck2} label="Ngày công" value={`${summary?.workDays ?? 0} ngày`} tone="indigo" loading={isPending} />
        <StatCard
          icon={Hourglass}
          label="Tổng giờ làm"
          value={formatDuration(summary?.totalWorkedMinutes ?? 0)}
          tone="emerald"
          loading={isPending}
        />
        <StatCard
          icon={AlarmClock}
          label="Đi muộn"
          value={`${summary?.lateCount ?? 0} lần`}
          hint={`Tổng ${formatDuration(summary?.totalLateMinutes ?? 0)}`}
          tone="amber"
          loading={isPending}
        />
        <StatCard icon={LogOut} label="Về sớm" value={`${summary?.earlyLeaveCount ?? 0} lần`} tone="rose" loading={isPending} />
        <div className="rounded-xl border bg-muted/30 p-4 sm:col-span-2 lg:col-span-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">Tỷ lệ đúng giờ</span>
            <span className="font-semibold tabular-nums">{onTimeRate === null ? '—' : `${onTimeRate}%`}</span>
          </div>
          <Progress value={onTimeRate ?? 0} className="h-2" />
          <p className="mt-2 text-xs text-muted-foreground">
            {shiftsIn > 0 ? `${onTimeShifts}/${shiftsIn} lượt vào ca đúng giờ` : 'Chưa có ngày công nào trong tháng'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
