import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatDuration, formatMonth } from '@/lib/format'
import { lateLevelLabel } from '@/lib/late-levels'
import { cn } from '@/lib/utils'
import { PartTimeSheetPanel } from '@/features/part-time/PartTimeSheetPanel'
import type { FullTimeSummary, LeaveSummary, MyTimesheet, PartTimeSummary } from './my-timesheet.types'

const num = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })

function Section({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0 p-3', className)}>
      <p className="text-sm font-medium text-muted-foreground">
        {label}
        {hint && <span className="ml-1.5 text-xs font-normal">{hint}</span>}
      </p>
      {children}
    </div>
  )
}

function BigNumber({ value, unit, tone }: { value: string; unit: string; tone?: string }) {
  return (
    <p className={cn('mt-1 text-2xl font-semibold tracking-tight tabular-nums', tone)}>
      {value}
      <span className="ml-1.5 text-sm font-normal tracking-normal text-muted-foreground">{unit}</span>
    </p>
  )
}

function StackedParts({ parts }: { parts: { label: string; value: number; unit?: string; color: string }[] }) {
  const sum = parts.reduce((n, p) => n + p.value, 0)
  return (
    <>
      <div className="my-3 flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-muted">
        {sum > 0 &&
          parts
            .filter((p) => p.value > 0)
            .map((p) => <i key={p.label} className={p.color} style={{ width: `${(p.value / sum) * 100}%` }} title={`${p.label}: ${num(p.value)}`} />)}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {parts.map((p) => (
          <span key={p.label} className="flex items-center gap-1.5 whitespace-nowrap">
            <i className={cn('size-2 rounded-sm', p.color)} />
            {p.label}
            <b className="font-semibold text-foreground tabular-nums">
              {num(p.value)}
              {p.unit}
            </b>
          </span>
        ))}
      </div>
    </>
  )
}

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <b className={cn('font-semibold whitespace-nowrap tabular-nums', warn && 'text-amber-600 dark:text-amber-400')}>{value}</b>
    </div>
  )
}

function FullTimeTotal({ data }: { data: FullTimeSummary }) {
  return (
    <Section label="Tổng công">
      <BigNumber value={num(data.totalWorkdays)} unit={`/ ${num(data.standardWorkdays)} công chuẩn`} />
      <StackedParts
        parts={[
          { label: 'Công máy', value: data.machineWorkdays, color: 'bg-primary' },
          { label: 'Online', value: data.onlineWorkdays, color: 'bg-sky-500' },
          { label: 'Lễ, bù', value: data.holidayWorkdays, color: 'bg-violet-500' },
          { label: 'Phép', value: data.leaveWorkdays, color: 'bg-emerald-500' },
        ]}
      />
    </Section>
  )
}

function PartTimeTotal({ data }: { data: PartTimeSummary }) {
  return (
    <Section label="Tổng giờ làm">
      <BigNumber value={num(data.totalHours)} unit="giờ" />
      <StackedParts
        parts={[
          { label: 'Offline', value: data.offlineHours, unit: 'h', color: 'bg-primary' },
          { label: 'Online', value: data.onlineHours, unit: 'h', color: 'bg-sky-500' },
        ]}
      />
    </Section>
  )
}

function LeaveSection({ leave }: { leave: LeaveSummary | null }) {
  if (!leave) {
    return (
      <Section label="Phép năm còn lại">
        <p className="mt-2 text-sm text-muted-foreground">Chưa có dữ liệu phép năm.</p>
      </Section>
    )
  }
  const usedPercent = leave.entitledDays > 0 ? Math.min(100, (leave.usedDays / leave.entitledDays) * 100) : 0
  return (
    <Section label={`Phép năm ${leave.year} còn lại`}>
      <BigNumber
        value={num(leave.remainingDays)}
        unit="ngày"
        tone={leave.remainingDays <= 2 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}
      />
      <Progress value={usedPercent} className="my-3 h-1.5" aria-label="Tỷ lệ phép đã dùng" />
      <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>
          Đã dùng <b className="font-semibold text-foreground tabular-nums">{num(leave.usedDays)}</b> / {num(leave.entitledDays)}
        </span>
        <span>
          Tháng này <b className="font-semibold text-foreground tabular-nums">{num(leave.usedInMonth)}</b>
        </span>
      </div>
    </Section>
  )
}

export function TimesheetSummaryCard({ data }: { data: MyTimesheet }) {
  const { attendance, fullTime, partTime, leave, closed, month } = data
  return (
    <Card>
      <CardHeader>
        <CardTitle>Công {formatMonth(month).toLowerCase()}</CardTitle>
        <CardDescription>
          {closed
            ? 'Số liệu theo bản chốt công của tháng.'
            : fullTime
              ? 'Tạm tính từ chấm công và phép năm. Công online, lễ, bù và tăng ca được cập nhật khi chốt công.'
              : 'Tạm tính từ chấm công, chỉ tính phần giờ nằm trong ca. Giờ online được cập nhật khi chốt công.'}
        </CardDescription>
        <CardAction>
          {!partTime && (
            <Badge
              variant="secondary"
              className={
                closed
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
              }
            >
              {closed ? 'Đã chốt' : 'Tạm tính'}
            </Badge>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {partTime && <PartTimeSheetPanel data={data} />}
        <div
          className={cn(
            'grid divide-y rounded-lg border md:divide-x md:divide-y-0',
            fullTime ? 'md:grid-cols-[1.35fr_0.85fr_1.1fr]' : 'md:grid-cols-[1.35fr_1fr]',
          )}
        >
          {fullTime && <FullTimeTotal data={fullTime} />}
          {partTime && <PartTimeTotal data={partTime} />}
          {fullTime && <LeaveSection leave={leave} />}
          <Section label="Ghi nhận khác" hint={fullTime ? 'không cộng vào tổng' : undefined}>
            <div className="mt-1">
              {fullTime && <Row label="Tăng ca" value={`${num(fullTime.overtimeWorkdays)} công`} />}
              <Row
                label="Đi muộn"
                value={
                  attendance.lateCount > 0
                    ? `${attendance.lateCount} lần · ${formatDuration(attendance.lateMinutes)}`
                    : '0 lần'
                }
                warn={attendance.lateCount > 0}
              />
              {attendance.lateCount > 0 && attendance.lateLevels.length > 0 && (
                <ul className="mb-1 space-y-1 border-l pl-3">
                  {attendance.lateLevels.map((l) => (
                    <li key={l.level} className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span>{lateLevelLabel(l.level, data.schedule.lateThresholds)}</span>
                      <span className={cn('tabular-nums', l.count > 0 && 'font-semibold text-foreground')}>{l.count} lần</span>
                    </li>
                  ))}
                </ul>
              )}
              <Row
                label={fullTime ? 'Thiếu chấm công' : 'Quên chấm công'}
                value={`${attendance.missingPunchCount} lần`}
                warn={attendance.missingPunchCount > 0}
              />
            </div>
          </Section>
        </div>
      </CardContent>
    </Card>
  )
}
