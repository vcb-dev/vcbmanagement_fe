import { CircleCheck, Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { STATUS_LABEL, STATUS_TONE, formatOvertime } from '@/features/monthly-timesheets/monthly-timesheets.types'
import { formatDateTime, formatDuration, formatMonth, todayYmd } from '@/lib/format'
import { lateLevelLabel, lateLevelShort, lateLevelTone } from '@/lib/late-levels'
import { cn } from '@/lib/utils'
import { ConfirmTimesheetButton } from './ConfirmTimesheetButton'
import type { LeaveSummary, MyTimesheet, TimesheetConfirmation } from './my-timesheet.types'

const num = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })
const WARN = 'text-amber-600 dark:text-amber-400'

/** Câu hướng dẫn xác nhận công dưới tiêu đề thẻ. */
function confirmationNote(confirmation: TimesheetConfirmation): string {
  if (confirmation.status === 'confirmed') {
    return `Bạn đã xác nhận lúc ${formatDateTime(confirmation.confirmedAt!)}. Nếu quản lý sửa số liệu, bạn sẽ cần xác nhận lại.`
  }
  return confirmation.reason ?? 'Kiểm tra số liệu. Đúng thì bấm xác nhận, chưa đúng thì báo quản lý nhân sự để sửa.'
}

/** Ô số liệu: nhãn nhỏ ở trên, số lớn, phần phụ bên dưới. */
function Tile({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn('min-w-0 rounded-lg bg-muted/50 px-3 py-2.5', className)}>
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      {children}
    </div>
  )
}

function Value({ value, unit, tone }: { value: string; unit?: string; tone?: string }) {
  return (
    <p className={cn('mt-0.5 text-xl leading-7 font-semibold tracking-tight tabular-nums', tone)}>
      {value}
      {unit && <span className="ml-1 text-xs font-normal tracking-normal text-muted-foreground">{unit}</span>}
    </p>
  )
}

function Sub({ children }: { children: ReactNode }) {
  return <p className="mt-0.5 text-xs text-muted-foreground">{children}</p>
}

/** Thanh mảnh: phần đã có trên tổng `of`. */
function Meter({ value, of, color }: { value: number; of: number; color: string }) {
  const width = of > 0 ? Math.min(100, (value / of) * 100) : 0
  return (
    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-foreground/10">
      <div className={cn('h-full rounded-full', color)} style={{ width: `${width}%` }} />
    </div>
  )
}

interface Part {
  label: string
  value: number
  unit?: string
  color: string
}

/**
 * Tổng công (hoặc tổng giờ) kèm thanh chia theo từng phần. Có mốc chuẩn thì thanh đo theo mốc chuẩn,
 * nên 7,5 / 25 công chỉ lấp gần một phần ba thanh.
 */
function TotalTile({ label, total, target, unit, parts }: { label: string; total: number; target?: number; unit: string; parts: Part[] }) {
  const scale = Math.max(target ?? 0, total)
  return (
    <Tile label={label} className="col-span-2 lg:col-span-1">
      <div className="flex items-baseline justify-between gap-2">
        <Value value={num(total)} unit={target ? `/ ${num(target)} ${unit}` : unit} />
        {!!target && <span className="text-xs text-muted-foreground tabular-nums">{Math.round((total / target) * 100)}%</span>}
      </div>
      <div className="mt-1.5 flex h-2 gap-px overflow-hidden rounded-full bg-foreground/10">
        {scale > 0 &&
          parts
            .filter((p) => p.value > 0)
            .map((p) => (
              <i key={p.label} className={p.color} style={{ width: `${(p.value / scale) * 100}%` }} title={`${p.label}: ${num(p.value)}`} />
            ))}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground">
        {parts.map((p) => (
          <span key={p.label} className="flex items-center gap-1 whitespace-nowrap">
            <i className={cn('size-1.5 rounded-full', p.color)} />
            {p.label}
            <b className={cn('tabular-nums', p.value > 0 ? 'font-semibold text-foreground' : 'font-normal')}>
              {num(p.value)}
              {p.unit}
            </b>
          </span>
        ))}
      </div>
    </Tile>
  )
}

function LeaveTile({ leave }: { leave: LeaveSummary | null }) {
  if (!leave) {
    return (
      <Tile label="Phép năm còn lại">
        <Value value="—" tone="text-muted-foreground/60" />
        <Sub>Chưa có dữ liệu phép năm</Sub>
      </Tile>
    )
  }
  const low = leave.remainingDays <= 2
  return (
    <Tile label={`Phép năm ${leave.year} còn lại`}>
      <Value
        value={num(leave.remainingDays)}
        unit={`/ ${num(leave.entitledDays)} ngày`}
        tone={low ? WARN : 'text-emerald-600 dark:text-emerald-400'}
      />
      <Meter value={leave.remainingDays} of={leave.entitledDays} color={low ? 'bg-amber-500' : 'bg-emerald-500'} />
      <Sub>
        Đã dùng {num(leave.usedDays)}
        {leave.usedInMonth > 0 && ` · tháng này ${num(leave.usedInMonth)}`}
      </Sub>
    </Tile>
  )
}

function LateTile({ data }: { data: MyTimesheet }) {
  const { lateCount, lateMinutes, lateLevels } = data.attendance
  const thresholds = data.schedule.lateThresholds
  const levels = lateLevels.filter((l) => l.count > 0)
  return (
    <Tile label="Đi muộn">
      <Value value={String(lateCount)} unit={lateCount ? `lần · ${formatDuration(lateMinutes)}` : 'lần'} tone={lateCount ? WARN : undefined} />
      {levels.length > 0 ? (
        <div className="mt-1 flex flex-wrap gap-1">
          {levels.map((l) => (
            <span
              key={l.level}
              title={`${lateLevelLabel(l.level, thresholds)}: ${l.count} lần`}
              className={cn('rounded px-1.5 text-[11px] leading-[18px] tabular-nums', lateLevelTone(l.level, thresholds))}
            >
              {thresholds.length ? lateLevelShort(l.level, thresholds) : `Mốc ${l.level}`}{' '}
              <b className="font-semibold">{l.count}</b>
            </span>
          ))}
        </div>
      ) : (
        <Sub>{lateCount ? 'Chưa cấu hình mốc đi muộn' : 'Không đi muộn'}</Sub>
      )}
    </Tile>
  )
}

function MissingTile({ data }: { data: MyTimesheet }) {
  const count = data.attendance.missingPunchCount
  return (
    <Tile label={data.fullTime ? 'Thiếu chấm công' : 'Quên chấm công'}>
      <Value value={String(count)} unit="lần" tone={count ? WARN : undefined} />
      <Sub>{count ? 'Thiếu giờ vào hoặc ra' : 'Các ca đủ giờ vào, ra'}</Sub>
    </Tile>
  )
}

function ExtraRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-[13px] leading-snug">
      <span className="text-muted-foreground">{label}</span>
      <b className="font-semibold whitespace-nowrap tabular-nums">{value}</b>
    </div>
  )
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
      'Công máy tính theo chấm công: mỗi ca đủ giờ vào và giờ ra được 0,5 công. Công từ xa, lễ, bù, phép và tăng ca do quản lý nhập.'
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

/** Thẻ tóm tắt công tháng: một dải ô số liệu, trạng thái và nút xác nhận ở đầu thẻ. */
export function TimesheetSummaryCard({ data }: { data: MyTimesheet }) {
  const { fullTime, partTime, leave, month, confirmation } = data
  const status = statusOf(data)
  return (
    <Card className="gap-3">
      {/* Nút xác nhận nằm bên phải tiêu đề; màn hẹp thì xuống dòng dưới mô tả. */}
      <CardHeader className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1 basis-80 space-y-1">
          <CardTitle className="flex flex-wrap items-center gap-2">
            Công {formatMonth(month).toLowerCase()}
            <Badge variant="secondary" className={status.tone}>
              {status.label}
            </Badge>
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
            <CardDescription className={cn('flex items-start gap-1.5', status.confirmed && 'text-emerald-700 dark:text-emerald-400')}>
              {status.confirmed && <CircleCheck className="mt-0.5 size-3.5 shrink-0" />}
              {status.note}
            </CardDescription>
          )}
        </div>
        {fullTime && confirmation?.status === 'pending' && (
          <ConfirmTimesheetButton month={month} confirmation={confirmation} summary={fullTime} />
        )}
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            'grid grid-cols-2 gap-2',
            fullTime
              ? 'lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1.35fr)]'
              : 'lg:grid-cols-[minmax(0,1.9fr)_repeat(2,minmax(0,1fr))]',
          )}
        >
          {fullTime && (
            <TotalTile
              label="Tổng công"
              total={fullTime.totalWorkdays}
              target={fullTime.standardWorkdays}
              unit="công chuẩn"
              parts={[
                { label: 'Công máy', value: fullTime.machineWorkdays, color: 'bg-primary' },
                { label: 'Từ xa', value: fullTime.onlineWorkdays, color: 'bg-sky-500' },
                { label: 'Lễ, bù', value: fullTime.holidayWorkdays, color: 'bg-violet-500' },
                { label: 'Phép', value: fullTime.leaveWorkdays, color: 'bg-emerald-500' },
              ]}
            />
          )}
          {partTime && (
            <TotalTile
              label="Tổng giờ làm"
              total={partTime.totalHours}
              unit="giờ"
              parts={[
                { label: 'Offline', value: partTime.offlineHours, unit: 'h', color: 'bg-primary' },
                { label: 'Online', value: partTime.onlineHours, unit: 'h', color: 'bg-sky-500' },
              ]}
            />
          )}
          {fullTime && <LeaveTile leave={leave} />}
          <LateTile data={data} />
          <MissingTile data={data} />
          {fullTime && (
            <Tile label="Không cộng vào tổng công">
              <div className="mt-1 space-y-1">
                <ExtraRow label="Tăng ca" value={`${formatOvertime(fullTime.overtimeWorkdays)} công`} />
                <ExtraRow label="Xin muộn, sớm, ra ngoài" value={`${num(fullTime.excusedWorkdays)} công`} />
              </div>
            </Tile>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
