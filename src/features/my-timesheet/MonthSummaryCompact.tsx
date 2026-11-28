import { AlarmClock, CalendarCheck2, Hourglass, LogOut, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAttendanceMonth } from '@/features/attendance/use-attendance'
import { formatDuration, formatMonth } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Cùng bảng màu với StatCard để điện thoại và máy tính nhìn như một. */
const TONES = {
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  rose: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
} as const

function Metric({
  icon: Icon,
  label,
  value,
  extra,
  tone,
  loading,
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
  extra?: ReactNode
  tone: keyof typeof TONES
  loading: boolean
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 bg-card px-3 py-2.5">
      <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', TONES[tone])}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        {loading ? (
          <Skeleton className="mt-1 h-5 w-14" />
        ) : (
          // Màn rất hẹp (320px) không đủ chỗ cho "12 lần 3g 45p" thì phần phụ xuống dòng thay vì bị cắt.
          <p className="flex flex-wrap items-baseline gap-x-1 text-base leading-6 font-semibold tabular-nums">
            <span className="whitespace-nowrap">{value}</span>
            {extra && <span className="text-xs font-normal whitespace-nowrap text-muted-foreground">{extra}</span>}
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Tổng hợp tháng bản điện thoại: 4 chỉ số trong một thẻ lưới 2×2 (~120px) thay cho 4 thẻ StatCard xếp dọc
 * (~1000px). Không có tiêu đề và nút đổi tháng vì thanh chọn tháng dính ở đầu trang đã hiện tháng.
 * Cùng nguồn số liệu với AttendanceMonthSummary (`useAttendanceMonth`), react-query gộp chung một lần gọi.
 */
export function MonthSummaryCompact({ month, className }: { month: string; className?: string }) {
  const { data, isPending } = useAttendanceMonth(month)
  const s = data?.summary
  const lateMinutes = s?.totalLateMinutes ?? 0

  return (
    <section aria-label={`Tổng hợp ${formatMonth(month).toLowerCase()}`} className={className}>
      <Card className="grid grid-cols-2 gap-px bg-border py-0">
        <Metric icon={CalendarCheck2} label="Ngày công" value={`${s?.workDays ?? 0} ngày`} tone="indigo" loading={isPending} />
        <Metric icon={Hourglass} label="Tổng giờ làm" value={formatDuration(s?.totalWorkedMinutes ?? 0)} tone="emerald" loading={isPending} />
        <Metric
          icon={AlarmClock}
          label="Đi muộn"
          value={`${s?.lateCount ?? 0} lần`}
          extra={lateMinutes > 0 ? formatDuration(lateMinutes) : undefined}
          tone="amber"
          loading={isPending}
        />
        <Metric icon={LogOut} label="Về sớm" value={`${s?.earlyLeaveCount ?? 0} lần`} tone="rose" loading={isPending} />
      </Card>
    </section>
  )
}
