import { ChevronLeft, ChevronRight, CircleCheck, Clock3, Info, MessageSquare, MessageSquareWarning, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatOvertime } from '@/features/monthly-timesheets/monthly-timesheets.types'
import { DisputeDialog } from '@/features/part-time/DisputeDialog'
import { PartTimeSheetPanel } from '@/features/part-time/PartTimeSheetPanel'
import { formatDate, formatDateTime, formatDayMonth, formatDuration, formatMonth, shiftMonth, todayYmd } from '@/lib/format'
import { lateLevelLabel } from '@/lib/late-levels'
import { EMPLOYMENT_LABEL } from '@/lib/user-display'
import { cn } from '@/lib/utils'
import { ConfirmTimesheetButton } from './ConfirmTimesheetButton'
import { isSunday, type LedgerDay } from './day-ledger'
import { daysOfMonth } from './day-status'
import type { MyTimesheet } from './my-timesheet.types'

const num = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })

/** Dẫn sang trang Feedback của tôi, mở sẵn feedback của tháng này; kèm số feedback đang chờ quản lý trả lời. */
function FeedbackLink({ month, openCount }: { month: string; openCount: number }) {
  return (
    <Button variant="outline" asChild>
      <Link
        to={`/my-feedbacks?month=${month}`}
        title={openCount > 0 ? `${openCount} feedback đang chờ quản lý trả lời` : 'Xem và trao đổi feedback về công tháng'}
      >
        <MessageSquare />
        Feedback
        {openCount > 0 && (
          <span className="rounded-full bg-rose-500/15 px-1.5 text-[11px] leading-4 font-semibold text-rose-700 tabular-nums dark:text-rose-400">
            {openCount}
          </span>
        )}
      </Link>
    </Button>
  )
}

function ProfileLine({ data, name }: { data: MyTimesheet; name: string }) {
  const { profile, schedule } = data
  const shifts = [
    `Ca sáng ${schedule.morningStart}–${schedule.morningEnd}`,
    `Ca chiều ${schedule.afternoonStart}–${schedule.afternoonEnd}`,
    schedule.evening && `Ca tối ${schedule.evening.start}–${schedule.evening.end}`,
  ]
  const parts = [
    name,
    profile.department?.name,
    EMPLOYMENT_LABEL[profile.employmentType],
    profile.contractStartDate && `Ký HĐ ${formatDate(profile.contractStartDate)}`,
    ...shifts,
  ].filter(Boolean)
  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground tabular-nums">
      {parts.join(' · ')}
      {!profile.department && (
        <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
          {profile.employmentType === 'part_time' ? 'Chưa gán bộ phận, chưa tính được công' : 'Chưa gán bộ phận, đang dùng giờ mặc định'}
        </Badge>
      )}
    </p>
  )
}

/** Đầu trang: "Công tháng 11/2026" với nút lùi, tiến tháng ngay cạnh, dòng thông tin nhân sự, nút Feedback bên phải. */
export function TimesheetHeader({
  month,
  maxMonth,
  onMonthChange,
  data,
  name,
}: {
  month: string
  maxMonth: string
  onMonthChange: (next: string) => void
  data: MyTimesheet | null
  name: string
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">Công {formatMonth(month).toLowerCase()}</h2>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" aria-label="Tháng trước" onClick={() => onMonthChange(shiftMonth(month, -1))}>
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Tháng sau"
              disabled={month >= maxMonth}
              onClick={() => onMonthChange(shiftMonth(month, 1))}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
        {data ? <ProfileLine data={data} name={name} /> : <Skeleton className="h-5 w-96 max-w-full" />}
      </div>
      {data?.sheet && <FeedbackLink month={month} openCount={data.sheet.openFeedbackCount} />}
    </header>
  )
}

type BannerTone = 'running' | 'action' | 'done' | 'disputed' | 'neutral'

const BANNER_TONE: Record<BannerTone, string> = {
  running: 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-500/50 dark:bg-amber-500/10 dark:text-amber-100',
  action: 'border-primary/45 bg-primary/5 text-foreground',
  done: 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-100',
  disputed: 'border-rose-300 bg-rose-50 text-rose-950 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-100',
  neutral: 'border-foreground/20 bg-muted/50 text-foreground',
}

function Banner({ tone, icon: Icon, actions, children }: { tone: BannerTone; icon: LucideIcon; actions?: ReactNode; children: ReactNode }) {
  return (
    <section
      aria-label="Trạng thái công tháng"
      className={cn('flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border px-4 py-3', BANNER_TONE[tone])}
    >
      <p className="flex min-w-0 flex-1 basis-80 items-start gap-2.5 text-sm leading-5">
        <Icon className="mt-0.5 size-4 shrink-0" />
        <span>{children}</span>
      </p>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </section>
  )
}

/** Nút báo sai công của bản chốt full-time. */
function DisputeButton({ sheetId }: { sheetId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="sm" variant="outline" className="bg-background" onClick={() => setOpen(true)}>
        Báo sai
      </Button>
      <DisputeDialog sheetId={sheetId} sheetType="full_time" open={open} onOpenChange={setOpen} />
    </>
  )
}

/**
 * Dải trạng thái công tháng, đổi theo tình hình: tháng đang chạy, chờ xác nhận (có nút Báo sai, Xác nhận),
 * đã báo sai, đã xác nhận. Part-time dùng khung bản chốt part-time có sẵn.
 */
export function StatusBanner({ data }: { data: MyTimesheet }) {
  const { fullTime, confirmation, sheet, month } = data
  if (!fullTime) {
    return (
      <section aria-label="Trạng thái công tháng" className="rounded-xl bg-card ring-1 ring-foreground/20">
        <PartTimeSheetPanel data={data} />
      </section>
    )
  }

  const ended = month < todayYmd().slice(0, 7)
  const canDispute = !!sheet && (sheet.status === 'pending' || sheet.status === 'disputed')
  const dispute = canDispute ? <DisputeButton sheetId={sheet.id} /> : null

  if (!confirmation) {
    return ended ? (
      <Banner tone="neutral" icon={Info}>
        <b className="font-semibold">Tháng đã qua.</b> Số liệu theo bản chốt công của tháng.
      </Banner>
    ) : (
      <Banner tone="running" icon={Clock3}>
        <b className="font-semibold">Tháng đang chạy.</b> Số liệu còn thay đổi theo chấm công hằng ngày.
      </Banner>
    )
  }

  if (confirmation.status === 'confirmed') {
    return (
      <Banner tone="done" icon={CircleCheck}>
        <b className="font-semibold">Đã xác nhận</b> lúc {formatDateTime(confirmation.confirmedAt!)}. Nếu quản lý sửa số liệu, bạn sẽ cần xác nhận lại.
      </Banner>
    )
  }

  const confirm = confirmation.canConfirm ? <ConfirmTimesheetButton month={month} confirmation={confirmation} summary={fullTime} /> : null

  if (confirmation.status === 'disputed') {
    return (
      <Banner tone="disputed" icon={MessageSquareWarning} actions={(dispute || confirm) && <>{dispute}{confirm}</>}>
        <b className="font-semibold">Bạn đã báo sai công tháng này.</b> Quản lý đang kiểm tra, trả lời nằm ở mục Feedback.
      </Banner>
    )
  }

  if (confirmation.canConfirm) {
    return (
      <Banner tone="action" icon={Info} actions={<>{dispute}{confirm}</>}>
        <b className="font-semibold">Chờ bạn xác nhận.</b> Kiểm tra số liệu bên dưới: đúng thì xác nhận, chưa đúng thì báo sai để quản lý sửa.
      </Banner>
    )
  }

  return (
    <Banner tone={ended ? 'neutral' : 'running'} icon={Clock3} actions={dispute}>
      <b className="font-semibold">{ended ? 'Chưa xác nhận được.' : 'Tháng đang chạy.'}</b>{' '}
      {confirmation.reason ?? 'Số liệu còn thay đổi theo chấm công hằng ngày.'}
    </Banner>
  )
}

/** Một ô của dải số liệu. */
function Stat({
  label,
  hint,
  aside,
  className,
  children,
}: {
  label: string
  /** Giải thích ngắn, hiện khi rê chuột vào biểu tượng (i) cạnh nhãn. */
  hint?: string
  aside?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('flex min-w-0 flex-[1_1_10rem] flex-col gap-1.5 bg-card px-4 py-3.5', className)}>
      <p className="flex items-center justify-between gap-2 text-[13px] text-muted-foreground">
        <span className="flex min-w-0 items-center gap-1">
          <span className="truncate">{label}</span>
          {hint && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" aria-label={hint} className="shrink-0 rounded-full hover:text-foreground">
                  <Info className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-72">{hint}</TooltipContent>
            </Tooltip>
          )}
        </span>
        {aside}
      </p>
      {children}
    </div>
  )
}

function Value({ value, unit, tone }: { value: string; unit?: string; tone?: string }) {
  return (
    <p className={cn('text-2xl leading-8 font-bold tracking-tight tabular-nums', tone)}>
      {value}
      {unit && <span className="ml-1.5 text-sm font-normal tracking-normal text-muted-foreground">{unit}</span>}
    </p>
  )
}

function Sub({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <p title={title} className="text-xs leading-5 text-muted-foreground">
      {children}
    </p>
  )
}

/** Số công chuẩn tính tới hôm nay (ngày đã qua trừ Chủ nhật), chỉ có ở tháng đang chạy. */
function standardSoFar(month: string): number | undefined {
  const today = todayYmd()
  if (month !== today.slice(0, 7)) return undefined
  return daysOfMonth(month).filter((d) => d <= today && !isSunday(d)).length
}

/** Tổng công của full-time: số lớn, một thanh tiến độ một màu có vạch "chuẩn đến hôm nay", và câu còn thiếu bao nhiêu. */
function TotalStat({ data }: { data: MyTimesheet }) {
  const ft = data.fullTime!
  const total = ft.totalWorkdays
  const target = ft.standardWorkdays
  const soFar = standardSoFar(data.month)
  const scale = Math.max(target, total, 1)
  const gap = Math.round(((soFar ?? target) - total) * 100) / 100
  const parts = [
    `Công máy ${num(ft.machineWorkdays)}`,
    ft.onlineWorkdays > 0 && `online ${num(ft.onlineWorkdays)}`,
    ft.holidayWorkdays > 0 && `lễ, bù ${num(ft.holidayWorkdays)}`,
    ft.leaveWorkdays > 0 && `phép ${num(ft.leaveWorkdays)}`,
  ].filter(Boolean)
  return (
    <Stat
      label="Tổng công"
      hint="Công máy tính theo chấm công: ca nào có chấm công (giờ vào hoặc giờ ra) được 0,5 công, quên một mốc vẫn được tính. Làm online, lễ, bù, phép và tăng ca do quản lý nhập."
      aside={target > 0 && <b className="font-semibold text-foreground tabular-nums">{Math.round((total / target) * 100)}%</b>}
      className="flex-[2_1_20rem]"
    >
      <Value value={num(total)} unit={`/ ${num(target)} công chuẩn`} />
      <div className="relative my-1 h-2 rounded-full bg-foreground/10">
        <div className="h-full rounded-full bg-primary" style={{ width: `${(Math.min(total, scale) / scale) * 100}%` }} />
        {soFar != null && soFar < scale && (
          <Tooltip>
            <TooltipTrigger asChild>
              <i className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-foreground" style={{ left: `${(soFar / scale) * 100}%` }} />
            </TooltipTrigger>
            <TooltipContent>Công chuẩn tính đến hôm nay: {num(soFar)}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <Sub>
        {soFar != null ? (
          <>
            Đến hôm nay cần <b className="font-semibold text-foreground tabular-nums">{num(soFar)}</b> công,{' '}
            {gap > 0 ? (
              <>
                bạn còn thiếu <b className="font-semibold text-foreground tabular-nums">{num(gap)}</b> công.
              </>
            ) : (
              'bạn đã đủ.'
            )}
          </>
        ) : gap > 0 ? (
          <>
            Còn thiếu <b className="font-semibold text-foreground tabular-nums">{num(gap)}</b> công so với {num(target)} công chuẩn.
          </>
        ) : (
          `Đã đủ ${num(target)} công chuẩn.`
        )}{' '}
        {parts.join(' · ')}.
      </Sub>
    </Stat>
  )
}

function LeaveStat({ data }: { data: MyTimesheet }) {
  const leave = data.leave
  if (!leave) {
    return (
      <Stat label="Phép năm">
        <Value value="—" tone="text-muted-foreground/60" />
        <Sub>Chưa có dòng phép năm</Sub>
      </Stat>
    )
  }
  const tone =
    leave.remainingDays < 0
      ? 'text-rose-700 dark:text-rose-400'
      : leave.remainingDays <= 2
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-emerald-700 dark:text-emerald-400'
  const months = (leave.months ?? []).map((m) => `T${m.month}: ${num(m.usedDays)}`).join(' · ')
  return (
    <Stat label={`Phép năm ${leave.year}`}>
      <Value value={num(leave.remainingDays)} unit="ngày còn lại" tone={tone} />
      <Sub title={months ? `Đã nghỉ theo tháng: ${months}` : undefined}>
        Đã nghỉ {num(leave.usedDays)} · cả năm {num(leave.entitledDays)} ngày
        {leave.usedInMonth > 0 && ` · tháng này ${num(leave.usedInMonth)}`}
      </Sub>
    </Stat>
  )
}

function LateStat({ data, days }: { data: MyTimesheet; days: LedgerDay[] }) {
  const { lateCount, lateMinutes, lateLevels } = data.attendance
  const thresholds = data.schedule.lateThresholds
  const early = days.flatMap((d) => d.shifts.filter((s) => s.earlyMinutes > 0))
  const excused = data.fullTime?.excusedWorkdays ?? 0
  const levels = lateLevels
    .filter((l) => l.count > 0)
    .map((l) => `${lateLevelLabel(l.level, thresholds)}: ${l.count} lần`)
    .join('\n')
  const sub = [
    lateMinutes > 0 && `Tổng ${formatDuration(lateMinutes)}`,
    early.length > 0 && `về sớm ${early.length} lần`,
    excused > 0 && `xin phép ${num(excused)} công`,
  ].filter(Boolean)
  return (
    <Stat label="Đi muộn">
      <Value value={String(lateCount)} unit="lần" tone={lateCount > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground/60'} />
      <Sub title={levels || undefined}>{lateCount === 0 && early.length === 0 ? 'Không đi muộn, về sớm lần nào' : sub.join(' · ')}</Sub>
    </Stat>
  )
}

function MissingStat({ data, days }: { data: MyTimesheet; days: LedgerDay[] }) {
  const count = data.attendance.missingPunchCount
  const missingDays = days.filter((d) => d.missingCount > 0).length
  return (
    <Stat label="Quên chấm">
      <Value value={String(count)} unit="mốc" tone={count > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-muted-foreground/60'} />
      <Sub>{count > 0 ? `${missingDays} ngày · cần quản lý bổ sung` : 'Không thiếu mốc nào'}</Sub>
    </Stat>
  )
}

function OvertimeStat({ data }: { data: MyTimesheet }) {
  const ft = data.fullTime!
  const days = ft.overtimeDays ?? []
  const last = days[days.length - 1]
  return (
    <Stat
      label="Tăng ca"
      hint="Quản lý nhập số giờ tăng ca theo từng ngày (số thập phân, vd 1,5 = 1 giờ 30 phút). Tăng ca tính riêng, không cộng vào tổng công."
    >
      <Value
        value={formatOvertime(ft.overtimeWorkdays)}
        unit="giờ"
        tone={ft.overtimeWorkdays > 0 ? 'text-violet-700 dark:text-violet-400' : 'text-muted-foreground/60'}
      />
      <Sub>{days.length > 0 ? `${days.length} ngày · gần nhất ${formatDayMonth(last.date)}` : 'Chưa có ngày tăng ca'}</Sub>
    </Stat>
  )
}

/** Part-time: tổng giờ, ngày đi làm, ca online. */
function PartTimeStats({ data, days }: { data: MyTimesheet; days: LedgerDay[] }) {
  const worked = days.filter((d) => (d.workedMinutes ?? 0) > 0)
  const totalMinutes = worked.reduce((n, d) => n + (d.workedMinutes ?? 0), 0)
  const summary = data.partTime ?? data.live
  const totalHours = summary?.totalHours ?? Math.round((totalMinutes / 60) * 100) / 100
  const onlineShifts = days.flatMap((d) => d.shifts.filter((s) => s.mode === 'online')).length
  return (
    <>
      <Stat label="Tổng giờ làm" hint="Chỉ tính phần giờ nằm trong ca. Giờ online được cập nhật khi chốt công." className="flex-[2_1_20rem]">
        <Value value={num(totalHours)} unit="giờ" />
        <Sub>
          Offline {num(summary?.offlineHours ?? 0)} giờ · online {num(summary?.onlineHours ?? 0)} giờ
          {data.closed ? ' · theo bản chốt công' : ' · tạm tính, còn thay đổi'}
        </Sub>
      </Stat>
      <Stat label="Ngày đi làm">
        <Value value={String(worked.length)} unit="ngày" />
        <Sub>{worked.length > 0 ? `TB ${formatDuration(Math.round(totalMinutes / worked.length))} mỗi ngày` : 'Chưa có ngày đi làm'}</Sub>
      </Stat>
      <Stat label="Ca online">
        <Value value={String(onlineShifts)} unit="ca" tone={onlineShifts > 0 ? 'text-sky-700 dark:text-sky-400' : 'text-muted-foreground/60'} />
        <Sub>Quản lý ghi giờ online khi chốt công</Sub>
      </Stat>
    </>
  )
}

/** Dải số liệu của tháng: khung kẻ đậm, các ô ngăn bằng đường kẻ (nền lộ qua khe 1px); màn hẹp tự xuống hàng. */
export function StatsStrip({ data, days }: { data: MyTimesheet; days: LedgerDay[] }) {
  return (
    <section aria-label="Tổng hợp tháng" className="flex flex-wrap gap-px overflow-hidden rounded-xl bg-foreground/15 ring-1 ring-foreground/20">
      {data.fullTime ? (
        <>
          <TotalStat data={data} />
          <LeaveStat data={data} />
          <OvertimeStat data={data} />
        </>
      ) : (
        <PartTimeStats data={data} days={days} />
      )}
      <LateStat data={data} days={days} />
      <MissingStat data={data} days={days} />
    </section>
  )
}
