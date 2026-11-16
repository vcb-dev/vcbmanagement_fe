import { ArrowRight, CircleCheck, Info } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { STATUS_LABEL, STATUS_TONE, formatOvertime } from '@/features/monthly-timesheets/monthly-timesheets.types'
import { DisputeDialog } from '@/features/part-time/DisputeDialog'
import { PartTimeSheetPanel } from '@/features/part-time/PartTimeSheetPanel'
import { formatDateTime, formatDayMonth, formatDuration, formatMonth, todayYmd } from '@/lib/format'
import { lateLevelLabel } from '@/lib/late-levels'
import { cn } from '@/lib/utils'
import { ConfirmTimesheetButton } from './ConfirmTimesheetButton'
import { isSunday, needsAttention, type LedgerDay } from './day-ledger'
import type { LedgerFilter } from './DayLedger'
import { daysOfMonth } from './day-status'
import type { LeaveSummary, MyTimesheet, TimesheetConfirmation } from './my-timesheet.types'

const num = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })

/** Câu hướng dẫn xác nhận công dưới tiêu đề thẻ. */
function confirmationNote(confirmation: TimesheetConfirmation): string {
  if (confirmation.status === 'confirmed') {
    return `Bạn đã xác nhận lúc ${formatDateTime(confirmation.confirmedAt!)}. Nếu quản lý sửa số liệu, bạn sẽ cần xác nhận lại.`
  }
  return confirmation.reason ?? 'Kiểm tra số liệu. Đúng thì bấm xác nhận, chưa đúng thì bấm Báo sai để quản lý sửa.'
}

interface Status {
  label: string
  tone: string
  note: string
  /** Cách tính, hiện khi rê chuột vào biểu tượng thông tin cạnh tiêu đề. */
  howTo: string
  confirmed?: boolean
}

function statusOf(data: MyTimesheet): Status {
  const ok = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
  const live = 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
  if (data.fullTime) {
    const ended = data.month < todayYmd().slice(0, 7)
    const running = ended ? '' : 'Tháng đang chạy, số liệu còn thay đổi. '
    const howTo =
      'Công máy tính theo chấm công: ca nào có chấm công (giờ vào hoặc giờ ra) được 0,5 công, quên một mốc vẫn được tính. Làm online, lễ, bù, phép và tăng ca do quản lý nhập.'
    if (!data.confirmation) {
      return { label: ended ? 'Tháng đã qua' : 'Đang cập nhật', tone: ended ? ok : live, note: running.trim(), howTo }
    }
    const { status } = data.confirmation
    return {
      label: STATUS_LABEL[status],
      tone: STATUS_TONE[status],
      note: status === 'confirmed' ? confirmationNote(data.confirmation) : running + confirmationNote(data.confirmation),
      howTo,
      confirmed: status === 'confirmed',
    }
  }
  const howTo = 'Chỉ tính phần giờ nằm trong ca. Giờ online được cập nhật khi chốt công.'
  return data.closed
    ? { label: 'Đã chốt', tone: ok, note: 'Số liệu theo bản chốt công của tháng.', howTo }
    : { label: 'Tạm tính', tone: live, note: 'Tạm tính từ chấm công, số liệu còn thay đổi.', howTo }
}

/** Một ô của dải tổng hợp: nhãn (và nút phụ) ở trên, phần thân tuỳ ô. */
function Cell({
  label,
  hint,
  action,
  footer,
  className,
  children,
}: {
  label: string
  /** Giải thích ngắn, hiện khi rê chuột vào biểu tượng (i) cạnh nhãn. */
  hint?: string
  action?: ReactNode
  /** Nút ở chân ô, luôn nằm sát đáy để các ô thẳng hàng. */
  footer?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn('flex min-w-0 flex-col gap-2 bg-card px-4 py-3.5', className)}>
      <h3 className="flex min-h-5 items-center justify-between gap-2 text-[13px] text-muted-foreground">
        <span className="flex min-w-0 items-center gap-1">
          <span className="truncate">{label}</span>
          {hint && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" aria-label={hint} className="shrink-0 rounded-full hover:text-foreground">
                  <Info className="size-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-64">{hint}</TooltipContent>
            </Tooltip>
          )}
        </span>
        {action}
      </h3>
      {children}
      {footer && <div className="mt-auto">{footer}</div>}
    </section>
  )
}

function Big({ value, unit, tone }: { value: string; unit?: string; tone?: string }) {
  return (
    <p className={cn('text-2xl leading-7 font-semibold tracking-tight tabular-nums', tone)}>
      {value}
      {unit && <span className="ml-1.5 text-sm font-normal tracking-normal text-muted-foreground">{unit}</span>}
    </p>
  )
}

function Sub({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-xs leading-5 text-muted-foreground', className)}>{children}</p>
}

/** Nút chữ nhỏ ở góc ô, dẫn xuống bảng theo ngày. */
function JumpLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 items-center gap-0.5 rounded text-xs font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      {children}
      <ArrowRight className="size-3" />
    </button>
  )
}

interface Part {
  label: string
  value: number
  color: string
}

/**
 * Tổng công và thanh chia theo phần. Thanh đo theo công chuẩn; tháng đang chạy có vạch "chuẩn đến hôm nay".
 * Chỉ ghi các phần khác 0 cho gọn.
 */
function TotalCell({ title, total, target, soFar, unit, parts }: { title: string; total: number; target?: number; soFar?: number; unit: string; parts: Part[] }) {
  const scale = Math.max(target ?? 0, total)
  const marker = soFar != null && target && soFar < target ? (soFar / scale) * 100 : null
  const shown = parts.filter((p) => p.value > 0)
  const compareTo = soFar ?? target
  const gap = compareTo != null ? Math.round((compareTo - total) * 100) / 100 : null

  return (
    <Cell
      label={title}
      className="col-span-2 lg:col-span-1"
      action={target ? <span className="font-medium tabular-nums">{Math.round((total / target) * 100)}%</span> : undefined}
    >
      <Big value={num(total)} unit={target ? `/ ${num(target)} ${unit}` : unit} />
      <div className="relative">
        <div className="flex h-2 gap-px overflow-hidden rounded-full bg-foreground/10">
          {scale > 0 && shown.map((p) => <i key={p.label} className={p.color} style={{ width: `${(p.value / scale) * 100}%` }} />)}
        </div>
        {marker != null && (
          <Tooltip>
            <TooltipTrigger asChild>
              <i className="absolute -top-1 -bottom-1 w-0.5 rounded-full bg-foreground" style={{ left: `${marker}%` }} />
            </TooltipTrigger>
            <TooltipContent>Công chuẩn tính đến hôm nay: {num(soFar!)}</TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
        {(shown.length ? shown : parts.slice(0, 1)).map((p) => (
          <span key={p.label} className="flex items-center gap-1.5 whitespace-nowrap text-muted-foreground">
            <i className={cn('size-2 rounded-[2px]', p.color)} />
            {p.label}
            <b className="font-semibold text-foreground tabular-nums">{num(p.value)}</b>
          </span>
        ))}
      </div>
      {gap != null && (
        <p className="flex items-start gap-1.5 text-xs leading-5 text-muted-foreground">
          {marker != null && <i className="mt-1 h-3 w-0.5 shrink-0 rounded-full bg-foreground" aria-hidden="true" />}
          <span>
            {soFar != null ? (
              <>
                Đến hôm nay cần <b className="font-semibold text-foreground tabular-nums">{num(soFar)}</b> công
                {gap > 0 ? (
                  <>
                    , bạn còn thiếu <b className="font-semibold text-foreground tabular-nums">{num(gap)}</b> công.
                  </>
                ) : (
                  ', bạn đã đủ.'
                )}
              </>
            ) : gap > 0 ? (
              <>
                Còn thiếu <b className="font-semibold text-foreground tabular-nums">{num(gap)}</b> công so với {num(target!)} công chuẩn.
              </>
            ) : (
              `Đã đủ ${num(target!)} công chuẩn của tháng.`
            )}
          </span>
        </p>
      )}
    </Cell>
  )
}

/** Phép năm: số còn lại và một thanh cả năm chia thành đã nghỉ, còn lại, chưa cộng; chú thích ghi đủ ba phần. */
function LeaveCell({ leave }: { leave: LeaveSummary | null }) {
  if (!leave) {
    return (
      <Cell label="Phép năm">
        <Big value="—" tone="text-muted-foreground/60" />
        <Sub>Chưa có dòng phép năm</Sub>
      </Cell>
    )
  }
  const year = Math.max(leave.entitledDays, leave.accruedDays, leave.usedDays, 1)
  const used = Math.min(leave.usedDays, year)
  const available = Math.max(0, leave.accruedDays - leave.usedDays)
  const notYet = Math.max(0, leave.entitledDays - Math.max(leave.accruedDays, leave.usedDays))
  const months = (leave.months ?? []).map((m) => `T${m.month}: ${num(m.usedDays)}`).join(' · ')
  const tone = leave.remainingDays < 0 ? 'text-rose-600 dark:text-rose-400' : leave.remainingDays <= 2 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'
  return (
    <Cell label={`Phép năm ${leave.year}`}>
      <Big value={num(leave.remainingDays)} unit="ngày còn lại" tone={tone} />
      <div className="flex h-2 gap-px overflow-hidden rounded-full bg-foreground/10" aria-hidden="true">
        {used > 0 && <i className="bg-emerald-600 dark:bg-emerald-500" style={{ width: `${(used / year) * 100}%` }} />}
        {available > 0 && <i className="bg-emerald-500/30" style={{ width: `${(available / year) * 100}%` }} />}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 whitespace-nowrap" title={months ? `Đã nghỉ theo tháng: ${months}` : undefined}>
          <i className="size-2 rounded-[2px] bg-emerald-600 dark:bg-emerald-500" />
          Đã nghỉ <b className="font-semibold text-foreground tabular-nums">{num(leave.usedDays)}</b>
        </span>
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          <i className="size-2 rounded-[2px] bg-emerald-500/30" />
          Còn lại <b className="font-semibold text-foreground tabular-nums">{num(available)}</b>
        </span>
        {notYet > 0 && (
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <i className="size-2 rounded-[2px] bg-foreground/10" />
            Chưa cộng <b className="font-semibold text-foreground tabular-nums">{num(notYet)}</b>
          </span>
        )}
      </div>
      <Sub>
        Cả năm {num(leave.entitledDays)} ngày, mỗi tháng được cộng 1 ngày.
        {leave.usedInMonth > 0 && (
          <span className="block text-emerald-700 dark:text-emerald-400">Tháng này nghỉ {num(leave.usedInMonth)} ngày</span>
        )}
      </Sub>
    </Cell>
  )
}

function OvertimeCell({ total, days, onShow }: { total: number; days: { date: string; workdays: number }[]; onShow: () => void }) {
  const last = days[days.length - 1]
  return (
    <Cell
      label="Tăng ca"
      hint="Quản lý nhập số giờ tăng ca theo từng ngày (số thập phân, vd 1,5 = 1 giờ 30 phút). Tăng ca tính riêng, không cộng vào tổng công."
      footer={days.length > 0 ? <JumpLink onClick={onShow}>Xem {days.length} ngày</JumpLink> : undefined}
    >
      <Big value={formatOvertime(total)} unit="giờ" tone={total > 0 ? 'text-violet-700 dark:text-violet-400' : undefined} />
      <Sub>{days.length > 0 ? `Gần nhất ${formatDayMonth(last.date)}` : 'Chưa có ngày tăng ca'}</Sub>
    </Cell>
  )
}

function Counter({ value, label, tone, title }: { value: number; label: string; tone: string; title?: string }) {
  return (
    <div title={title} className="min-w-0">
      <p className={cn('text-2xl leading-7 font-semibold tabular-nums', value > 0 ? tone : 'text-muted-foreground/50')}>{value}</p>
      <p className="text-xs whitespace-nowrap text-muted-foreground">{label}</p>
    </div>
  )
}

/** Chuyên cần: ba bộ đếm đi muộn, về sớm, thiếu in/out; chi tiết phút và mốc nằm trong chú thích khi rê chuột. */
function AttendanceCell({ data, days, onShow, className }: { data: MyTimesheet; days: LedgerDay[]; onShow: () => void; className?: string }) {
  const { lateCount, lateMinutes, lateLevels, missingPunchCount } = data.attendance
  const thresholds = data.schedule.lateThresholds
  const early = days.flatMap((d) => d.shifts.filter((s) => s.earlyMinutes > 0))
  const earlyMinutes = early.reduce((n, s) => n + s.earlyMinutes, 0)
  const levels = lateLevels
    .filter((l) => l.count > 0)
    .map((l) => `${lateLevelLabel(l.level, thresholds)}: ${l.count} lần`)
    .join('\n')
  const excused = data.fullTime?.excusedWorkdays ?? 0
  const flagged = days.filter(needsAttention).length
  return (
    <Cell
      label="Chuyên cần"
      className={className}
      footer={flagged > 0 ? <JumpLink onClick={onShow}>Xem {flagged} ngày</JumpLink> : undefined}
    >
      <div className="flex gap-x-4">
        <Counter value={lateCount} label="đi muộn" tone="text-amber-700 dark:text-amber-400" title={levels || undefined} />
        <Counter value={early.length} label="về sớm" tone="text-orange-700 dark:text-orange-400" />
        <Counter value={missingPunchCount} label="thiếu in/out" tone="text-rose-700 dark:text-rose-400" />
      </div>
      {(lateMinutes > 0 || earlyMinutes > 0 || excused > 0) && (
        <Sub>
          {[
            lateMinutes > 0 && `Muộn ${formatDuration(lateMinutes)}`,
            earlyMinutes > 0 && `sớm ${formatDuration(earlyMinutes)}`,
            excused > 0 && `xin phép ${num(excused)} công`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Sub>
      )}
    </Cell>
  )
}

/** Giờ làm thực tế, chỉ hiện cho part-time (toàn thời gian tính bằng công). */
function HoursCell({ days }: { days: LedgerDay[] }) {
  const worked = days.filter((d) => (d.workedMinutes ?? 0) > 0)
  const total = worked.reduce((n, d) => n + (d.workedMinutes ?? 0), 0)
  const average = worked.length ? Math.round(total / worked.length) : 0
  const online = days.flatMap((d) => d.shifts.filter((s) => s.mode === 'online')).length
  return (
    <Cell label="Giờ làm thực tế" className="col-span-2 sm:col-span-1">
      <Big value={formatDuration(total)} />
      <Sub>
        {worked.length} ngày đi làm
        {worked.length > 0 && <span className="block">TB {formatDuration(average)} mỗi ngày</span>}
        {online > 0 && <span className="block">{online} ca online</span>}
      </Sub>
    </Cell>
  )
}

/** Số công chuẩn tính tới hôm nay (ngày đã qua trừ Chủ nhật), chỉ có ở tháng đang chạy. */
function standardSoFar(month: string): number | undefined {
  const today = todayYmd()
  if (month !== today.slice(0, 7)) return undefined
  return daysOfMonth(month).filter((d) => d <= today && !isSunday(d)).length
}

/** Nút báo sai công của bản chốt toàn thời gian, đặt ở đầu thẻ cạnh nút xác nhận. */
function DisputeButton({ sheetId }: { sheetId: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Báo sai
      </Button>
      <DisputeDialog sheetId={sheetId} sheetType="full_time" open={open} onOpenChange={setOpen} />
    </>
  )
}

/**
 * Thẻ tổng hợp công tháng: trạng thái và các nút ở đầu thẻ, bên dưới là một dải ô:
 * toàn thời gian có tổng công, phép năm, tăng ca, chuyên cần; part-time có tổng giờ, chuyên cần, giờ làm. Các nút "Xem ngày" dẫn xuống bảng theo ngày đã lọc.
 */
export function TimesheetSummaryCard({
  data,
  days,
  onShowDays,
}: {
  data: MyTimesheet
  days: LedgerDay[]
  onShowDays: (filter: LedgerFilter) => void
}) {
  const { fullTime, partTime, leave, month, confirmation, sheet } = data
  const status = statusOf(data)
  const canDispute = !!fullTime && !!sheet && (sheet.status === 'pending' || sheet.status === 'disputed')

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b py-3">
        <div className="min-w-0 flex-1 basis-80 space-y-0.5">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base font-semibold">
            Công {formatMonth(month).toLowerCase()}
            {!partTime && (
              <Badge variant="secondary" className={status.tone}>
                {status.label}
              </Badge>
            )}
            {fullTime && sheet && sheet.openFeedbackCount > 0 && (
              <Badge variant="outline" className="border-rose-300 text-rose-600 dark:border-rose-800 dark:text-rose-400">
                {sheet.openFeedbackCount} phản hồi mở
              </Badge>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" aria-label="Cách tính công" className="text-muted-foreground hover:text-foreground">
                  <Info className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-72">{status.howTo}</TooltipContent>
            </Tooltip>
          </CardTitle>
          {status.note && (
            <CardDescription className={cn('flex items-start gap-1.5 text-[13px]', status.confirmed && 'text-emerald-700 dark:text-emerald-400')}>
              {status.confirmed && <CircleCheck className="mt-0.5 size-3.5 shrink-0" />}
              {status.note}
            </CardDescription>
          )}
        </div>
        {(canDispute || confirmation?.status === 'pending') && (
          <div className="flex items-center gap-2">
            {canDispute && <DisputeButton sheetId={sheet!.id} />}
            {fullTime && confirmation?.status === 'pending' && (
              <ConfirmTimesheetButton month={month} confirmation={confirmation} summary={fullTime} />
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="px-0">
        {/* Part-time xác nhận, báo sai ở khung riêng của bản chốt part-time. */}
        {!fullTime && (partTime || sheet) && (
          <div className="border-b">
            <PartTimeSheetPanel data={data} />
          </div>
        )}
        <div
          className={cn(
            'grid grid-cols-2 gap-px bg-foreground/10',
            fullTime
              ? 'lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.1fr)]'
              : 'lg:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,1fr))]',
          )}
        >
          {fullTime ? (
            <TotalCell
              title="Tổng công"
              total={fullTime.totalWorkdays}
              target={fullTime.standardWorkdays}
              soFar={standardSoFar(month)}
              unit="công chuẩn"
              parts={[
                { label: 'Công máy', value: fullTime.machineWorkdays, color: 'bg-primary' },
                { label: 'Làm online', value: fullTime.onlineWorkdays, color: 'bg-sky-500' },
                { label: 'Lễ, bù', value: fullTime.holidayWorkdays, color: 'bg-violet-500' },
                { label: 'Nghỉ phép', value: fullTime.leaveWorkdays, color: 'bg-emerald-500' },
              ]}
            />
          ) : (
            <TotalCell
              title="Tổng giờ làm"
              total={partTime?.totalHours ?? 0}
              unit="giờ"
              parts={[
                { label: 'Offline', value: partTime?.offlineHours ?? 0, color: 'bg-primary' },
                { label: 'Online', value: partTime?.onlineHours ?? 0, color: 'bg-sky-500' },
              ]}
            />
          )}
          {fullTime && <LeaveCell leave={leave} />}
          {fullTime && <OvertimeCell total={fullTime.overtimeWorkdays} days={fullTime.overtimeDays ?? []} onShow={() => onShowDays('overtime')} />}
          {/* Toàn thời gian: ô này nằm riêng một hàng ở màn vừa (4 ô), part-time thì chung hàng với ô Giờ làm. */}
          <AttendanceCell
            data={data}
            days={days}
            onShow={() => onShowDays('attention')}
            className={fullTime ? 'col-span-2 lg:col-span-1' : 'col-span-2 sm:col-span-1'}
          />
          {!fullTime && <HoursCell days={days} />}
        </div>
      </CardContent>
    </Card>
  )
}
