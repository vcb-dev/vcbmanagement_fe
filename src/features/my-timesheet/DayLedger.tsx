import {
  BriefcaseBusiness,
  CalendarDays,
  CircleAlert,
  Clock3,
  Info,
  Moon,
  Sun,
  Sunset,
  TimerReset,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo } from 'react'
import type { AttendanceSlot } from '@/features/attendance/attendance.types'
import { formatOvertime } from '@/features/monthly-timesheets/monthly-timesheets.types'
import type { WorkShift } from '@/features/part-time/part-time.types'
import { formatClockMinutes, formatDayMonth, formatDuration, formatTime, weekdayShort } from '@/lib/format'
import { lateLevelLabel } from '@/lib/late-levels'
import { useElementWidth } from '@/hooks/use-element-width'
import { cn } from '@/lib/utils'
import { SHIFT_NAME, isSunday, ledgerCounts, needsAttention, type LedgerDay, type LedgerShift } from './day-ledger'

type Variant = 'full_time' | 'part_time'
export type LedgerFilter = 'all' | 'attention' | 'overtime' | 'online'

/** Yêu cầu từ ngoài bảng: cuộn tới một ngày hoặc tới đầu bảng. `at` đổi mỗi lần bấm. */
export interface LedgerFocus {
  ymd?: string
  at: number
}

const num = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })

// Đầu bảng nền xám nhạt như Bảng chấm công; kẻ đậm dưới đầu bảng để tách khỏi thân bảng.
const HEAD = 'bg-muted px-2 text-center align-middle text-[13px] leading-5 font-semibold whitespace-nowrap text-foreground'
const HEAD_LINE_R = 'border-r border-r-border'
const HEAD_LINE_B = 'border-b border-b-foreground/15'
const HEAD_ICON = 'size-4 text-muted-foreground'
/** Thân bảng: kẻ dọc giữa các cột, kẻ ngang nhạt giữa các dòng. */
const LINE_R = 'border-r border-r-border'
const ROW = 'h-8'
/** Độ rộng cột đặt ở <colgroup> (bảng table-fixed); các cột giờ và số chia đều phần còn lại. */
const DATE_COL = 'sticky left-0 z-1'
/** Nền Chủ nhật dạng đặc (bằng bg-muted/60 phủ trên nền thẻ) cho ô dính trái. */
const SUNDAY_SOLID = 'bg-[color-mix(in_oklab,var(--card),var(--muted)_60%)]'

const SHIFT_ICON: Record<WorkShift, { icon: LucideIcon; tone: string }> = {
  morning: { icon: Sun, tone: 'text-amber-500' },
  afternoon: { icon: Sunset, tone: 'text-orange-500' },
  evening: { icon: Moon, tone: 'text-sky-500' },
}

const SLOT_OF: Record<WorkShift, [AttendanceSlot, AttendanceSlot] | null> = {
  morning: ['morning_in', 'morning_out'],
  afternoon: ['afternoon_in', 'afternoon_out'],
  evening: null,
}

/** Lượt quản lý đã bổ sung hoặc sửa: giờ đang dùng khác lượt chấm gốc (lượt gốc nằm ở `punches`). */
function slotAdjusted(day: LedgerDay, shift: WorkShift, which: 0 | 1, iso: string | null): boolean {
  const record = day.record
  const slot = SLOT_OF[shift]?.[which]
  if (!record?.adjustment || !iso || !slot) return false
  const punch = record.punches.find((p) => p.slot === slot)
  return !punch || formatTime(punch.at) !== formatTime(iso)
}

function applyFilter(days: LedgerDay[], filter: LedgerFilter): LedgerDay[] {
  if (filter === 'attention') return days.filter(needsAttention)
  if (filter === 'overtime') return days.filter((d) => d.overtime > 0)
  if (filter === 'online') return days.filter((d) => d.onlineMinutes > 0)
  return days
}

/** Bộ lọc ngày dạng nút gộp, đặt ở đầu khu vực bên cạnh tab. */
export function LedgerFilterBar({
  variant,
  days,
  value,
  onChange,
  className,
}: {
  variant: Variant
  days: LedgerDay[]
  value: LedgerFilter
  onChange: (next: LedgerFilter) => void
  className?: string
}) {
  const counts = ledgerCounts(days)
  const items: { value: LedgerFilter; label: string }[] = [
    { value: 'all', label: 'Tất cả' },
    { value: 'attention', label: `Cần chú ý · ${counts.attention}` },
    variant === 'full_time'
      ? { value: 'overtime', label: `Tăng ca · ${counts.overtime}` }
      : { value: 'online', label: `Online · ${counts.online}` },
  ]
  return (
    <div role="group" aria-label="Lọc ngày" className={cn('inline-flex h-9 items-center rounded-lg bg-muted p-[3px] pointer-coarse:h-11', className)}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          aria-pressed={value === item.value}
          onClick={() => onChange(item.value)}
          title={item.value === 'attention' ? 'Ngày đi muộn, về sớm hoặc thiếu giờ vào, ra' : undefined}
          className={cn(
            'h-full flex-1 rounded-md px-2 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none sm:flex-none sm:px-3',
            value === item.value ? 'bg-background text-foreground shadow-sm' : 'text-foreground/75 hover:text-foreground',
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

/** Gạch "không có giá trị": chỉ để mắt thấy ô trống có chủ ý, trình đọc màn hình bỏ qua. */
function Dash() {
  return (
    <span className="text-muted-foreground/50" aria-hidden="true">
      –
    </span>
  )
}

interface SlotProps {
  iso: string | null
  missing: boolean
  /** Thiếu mốc nhưng ca vẫn được tính công (toàn thời gian): tô hổ phách thay vì đỏ. */
  keepsCredit?: boolean
  off: boolean
  adjusted: boolean
}

/**
 * Giờ chấm (muộn, sớm thì có nền cam), "--:--" khi thiếu mốc (đỏ nếu mất công, hổ phách nếu ca vẫn được tính),
 * gạch khi không có; chấm xanh khi quản lý đã sửa.
 */
function SlotValue({ iso, missing, keepsCredit, off, adjusted }: SlotProps) {
  if (iso) {
    return (
      <span className="relative inline-flex items-center whitespace-nowrap">
        <span className={cn(off && 'rounded-md bg-amber-500/15 px-1.5 py-0.5 font-semibold text-amber-800 dark:text-amber-300')}>
          {formatTime(iso)}
        </span>
        {adjusted && (
          <>
            <i aria-hidden="true" title="Quản lý đã bổ sung giờ" className="absolute -right-2.5 size-1.5 rounded-full bg-sky-500" />
            <span className="sr-only"> (quản lý đã bổ sung)</span>
          </>
        )}
      </span>
    )
  }
  if (missing) {
    return (
      <span
        className={cn(
          'rounded-md px-1.5 py-0.5 font-semibold whitespace-nowrap',
          keepsCredit ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300' : 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
        )}
      >
        --:--<span className="sr-only"> (thiếu)</span>
      </span>
    )
  }
  return <Dash />
}

/** Ô giờ của bảng. */
function SlotCell({ className, ...slot }: SlotProps & { className?: string }) {
  return (
    <td className={cn(ROW, LINE_R, 'px-1 text-center text-[13px] tabular-nums', className)}>
      <SlotValue {...slot} />
    </td>
  )
}

/** Cách hiện một ca: online, bổ sung không có giờ cụ thể, hoặc hai mốc Vào / Ra. */
type ShiftView =
  | { kind: 'online'; minutes: number | null }
  | { kind: 'added'; minutes: number }
  | { kind: 'slots'; in: SlotProps; out: SlotProps }

function shiftView(day: LedgerDay, s: LedgerShift, variant: Variant): ShiftView {
  if (s.mode === 'online') return { kind: 'online', minutes: s.workedMinutes }
  if (s.mode !== 'none' && !s.inAt && !s.outAt && s.workedMinutes) return { kind: 'added', minutes: s.workedMinutes }
  // Không chấm trưa: ra sáng và vào chiều trống nhưng không phải thiếu mốc.
  const outAt = day.noLunch && s.key === 'morning' ? null : s.outAt
  const keepsCredit = variant === 'full_time'
  return {
    kind: 'slots',
    in: { iso: s.inAt, missing: s.missing && !s.inAt, keepsCredit, off: s.lateMinutes > 0, adjusted: slotAdjusted(day, s.key, 0, s.inAt) },
    out: { iso: outAt, missing: s.missing && !s.outAt, keepsCredit, off: s.earlyMinutes > 0, adjusted: slotAdjusted(day, s.key, 1, outAt) },
  }
}

function OnlinePill({ minutes }: { minutes: number | null }) {
  return (
    <span className="rounded-md bg-sky-500/10 px-1.5 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-400">
      Online {minutes ? formatDuration(minutes) : ''}
    </span>
  )
}

/** Hai ô Vào, Ra của một ca. Ca online hoặc giờ bổ sung không có giờ cụ thể thì gộp thành một ô. */
function ShiftCells({ day, s, variant }: { day: LedgerDay; s: LedgerShift; variant: Variant }) {
  const view = shiftView(day, s, variant)
  if (view.kind === 'online') {
    return (
      <td colSpan={2} className={cn(ROW, LINE_R, 'px-1 text-center')}>
        <OnlinePill minutes={view.minutes} />
      </td>
    )
  }
  if (view.kind === 'added') {
    return (
      <td colSpan={2} className={cn(ROW, LINE_R, 'px-1 text-center text-xs text-muted-foreground')}>
        Bổ sung {formatDuration(view.minutes)}
      </td>
    )
  }
  return (
    <>
      <SlotCell {...view.in} />
      <SlotCell {...view.out} />
    </>
  )
}

type NoteKind = 'warn' | 'error' | 'info' | 'live' | 'muted'

const NOTE_STYLE: Record<NoteKind, { tone: string; icon: LucideIcon | null }> = {
  warn: { tone: 'bg-amber-500/12 text-amber-800 dark:text-amber-300', icon: CircleAlert },
  error: { tone: 'bg-rose-500/10 text-rose-700 dark:text-rose-400', icon: TriangleAlert },
  info: { tone: 'bg-sky-500/10 text-sky-700 dark:text-sky-400', icon: Info },
  live: { tone: 'bg-primary/10 text-primary', icon: Clock3 },
  muted: { tone: 'bg-muted text-muted-foreground', icon: null },
}

/** Ghi chú của một ngày: muộn, sớm, thiếu mốc, không chấm trưa, quản lý bổ sung, hôm nay chưa chấm. */
interface Note {
  text: string
  kind: NoteKind
  /** Chú thích khi rê chuột, vd khoảng phút của mốc đi muộn. */
  title?: string
}

function notesOf(day: LedgerDay, thresholds: readonly number[], variant: Variant): Note[] {
  const notes: Note[] = []
  for (const s of day.shifts) {
    const shift = SHIFT_NAME[s.key].toLowerCase()
    if (s.missing) {
      // Toàn thời gian: ca có một mốc vẫn được 0,5 công, nên đây là nhắc nhở chứ không phải mất công.
      notes.push(
        variant === 'full_time'
          ? { text: `Quên chấm ${s.inAt ? 'ra' : 'vào'} ${shift}`, kind: 'warn', title: 'Ca vẫn được tính 0,5 công' }
          : { text: `Thiếu giờ ${s.inAt ? 'ra' : 'vào'} ${shift}`, kind: 'error' },
      )
    }
    if (s.lateMinutes > 0) {
      const level = s.lateLevel != null && thresholds.length ? ` · M${s.lateLevel}` : ''
      notes.push({
        text: `Muộn ${shift} ${formatDuration(s.lateMinutes)}${level}`,
        kind: 'warn',
        title: s.lateLevel != null ? lateLevelLabel(s.lateLevel, thresholds) : undefined,
      })
    }
    if (s.earlyMinutes > 0) notes.push({ text: `Về sớm ${shift} ${formatDuration(s.earlyMinutes)}`, kind: 'warn' })
    if (s.inProgress) notes.push({ text: `Đang làm ca ${shift}`, kind: 'live' })
  }
  if (day.record?.adjustment) notes.push({ text: 'Quản lý đã bổ sung giờ', kind: 'info' })
  if (day.noLunch) notes.push({ text: 'Không chấm trưa', kind: 'muted' })
  if (day.unpunched) {
    notes.push({ text: 'Chưa có công', kind: 'muted', title: 'Không có lượt chấm nào. Nghỉ phép, lễ hay làm online do quản lý nhập, tính vào tổng công.' })
  } else if (day.kind === 'absent') {
    notes.push({ text: day.isToday ? 'Hôm nay chưa chấm công' : 'Không có lượt chấm công', kind: 'muted' })
  }
  return notes
}

function NotePill({ text, kind, title }: Note) {
  const { tone, icon: Icon } = NOTE_STYLE[kind]
  return (
    <span title={title} className={cn('inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium whitespace-nowrap', tone)}>
      {Icon && <Icon className="size-3.5" />}
      {text}
    </span>
  )
}

interface RowProps {
  day: LedgerDay
  variant: Variant
  thresholds: readonly number[]
  /** Có khi tháng này còn báo sai được: mở hộp báo sai với nội dung điền sẵn ngày và ghi chú. */
  onDispute?: (text: string) => void
}

/** Ngày nào nên có nút báo sai riêng: ngày cần chú ý, hoặc ngày thường chưa có công (có thể đã đi làm mà máy không ghi). */
function disputable(day: LedgerDay): boolean {
  return !day.isToday && (needsAttention(day) || day.unpunched)
}

/** Nội dung điền sẵn khi báo sai một ngày, để quản lý biết ngay ngày nào và vì sao. */
function disputeDraft(day: LedgerDay, notes: Note[]): string {
  const what = notes.map((n) => n.text).join(', ')
  return `Ngày ${formatDayMonth(day.date)} (${weekdayShort(day.date)})${what ? ` – ${what}` : ''}: `
}

function DisputeDayButton({
  day,
  notes,
  onDispute,
  short,
  className,
}: {
  day: LedgerDay
  notes: Note[]
  onDispute: (text: string) => void
  /** Nhãn ngắn cho ô Ghi chú hẹp của bảng; tên đọc cho trình đọc màn hình vẫn đủ ngày. */
  short?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onDispute(disputeDraft(day, notes))}
      aria-label={`Báo sai ngày ${formatDayMonth(day.date)}`}
      className={cn(
        'inline-flex shrink-0 items-center rounded-md px-1.5 text-xs font-medium text-primary hover:bg-primary/10 hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
        className,
      )}
    >
      {short ? 'Báo sai' : 'Báo sai ngày này'}
    </button>
  )
}

function DayRow({ day, variant, thresholds, onDispute }: RowProps) {
  const sunday = isSunday(day.date)
  const notes = notesOf(day, thresholds, variant)

  return (
    <tr
      id={`ledger-${day.date}`}
      className={cn('scroll-mt-24 [&>*]:border-b [&>*]:border-b-border/70', sunday && '[&>td]:bg-muted/60', 'hover:[&>td]:bg-primary/[0.03]')}
    >
      <th scope="row" className={cn(DATE_COL, ROW, LINE_R, sunday ? SUNDAY_SOLID : 'bg-card', 'px-3 text-left font-normal whitespace-nowrap')}>
        <span className="flex items-center gap-2">
          <span className={cn('w-10 text-[13px] font-semibold tabular-nums', day.isToday && 'text-primary')}>{formatDayMonth(day.date)}</span>
          <span
            className={cn(
              'rounded px-1.5 text-[11px] leading-4 font-semibold',
              day.isToday ? 'bg-primary text-primary-foreground' : sunday ? 'bg-foreground/10 text-foreground' : 'bg-muted text-muted-foreground',
            )}
          >
            {weekdayShort(day.date)}
          </span>
        </span>
      </th>

      {day.shifts.map((s) => (
        <ShiftCells key={s.key} day={day} s={s} variant={variant} />
      ))}

      {variant === 'full_time' ? (
        <>
          <td className={cn(ROW, LINE_R, 'px-2 text-center text-[13px] font-semibold tabular-nums')}>
            {day.workdays != null ? (
              <span className={cn(day.workdays === 0 && (day.unpunched ? 'text-muted-foreground' : 'text-rose-700 dark:text-rose-400'))}>
                {num(day.workdays)}
              </span>
            ) : (
              <Dash />
            )}
          </td>
          <td className={cn(ROW, LINE_R, 'px-2 text-center text-[13px] tabular-nums')}>
            {day.overtime > 0 ? (
              <span className="font-semibold text-violet-700 dark:text-violet-400">+{formatOvertime(day.overtime)}</span>
            ) : (
              <Dash />
            )}
          </td>
        </>
      ) : (
        <>
          <td className={cn(ROW, LINE_R, 'px-2 text-center text-[13px] tabular-nums')}>
            {day.offlineMinutes ? formatDuration(day.offlineMinutes) : <Dash />}
          </td>
          <td className={cn(ROW, LINE_R, 'px-2 text-center text-[13px] tabular-nums')}>
            {day.onlineMinutes ? <span className="text-sky-700 dark:text-sky-400">{formatDuration(day.onlineMinutes)}</span> : <Dash />}
          </td>
        </>
      )}

      {/* Ghi chú hiện đủ; ngày có nhiều ghi chú thì xuống dòng trong ô. */}
      <td className={cn(ROW, 'px-3 py-1')}>
        <span className="flex flex-wrap items-center gap-1">
          {notes.map((n) => (
            <NotePill key={n.text} {...n} />
          ))}
          {onDispute && disputable(day) && <DisputeDayButton day={day} notes={notes} onDispute={onDispute} short className="ml-auto h-6" />}
        </span>
      </td>
    </tr>
  )
}

/** Một ca trên điện thoại: biểu tượng, tên ca, rồi Vào – Ra trên cùng một dòng. */
function ShiftLine({ day, s, variant }: { day: LedgerDay; s: LedgerShift; variant: Variant }) {
  const { icon: Icon, tone } = SHIFT_ICON[s.key]
  const view = shiftView(day, s, variant)
  return (
    <div className="flex min-h-6 items-center gap-1.5 text-[13px] tabular-nums">
      <Icon className={cn('size-3.5 shrink-0', tone)} aria-hidden="true" />
      <span className="w-9 shrink-0 text-xs text-muted-foreground">{SHIFT_NAME[s.key]}</span>
      {view.kind === 'online' ? (
        <OnlinePill minutes={view.minutes} />
      ) : view.kind === 'added' ? (
        <span className="text-xs text-muted-foreground">Bổ sung {formatDuration(view.minutes)}</span>
      ) : (
        <span className="flex items-center gap-1.5">
          <span className="sr-only">Vào</span>
          <SlotValue {...view.in} />
          <span className="text-muted-foreground/60" aria-hidden="true">→</span>
          <span className="sr-only">Ra</span>
          <SlotValue {...view.out} />
        </span>
      )}
    </div>
  )
}

/** Số của ngày ở cột phải trên điện thoại: công và tăng ca, hoặc giờ offline / online với part-time. */
function DayMetrics({ day, variant }: { day: LedgerDay; variant: Variant }) {
  if (variant === 'full_time') {
    if (day.workdays == null && day.overtime <= 0) return null
    return (
      <>
        {day.workdays != null && (
          <>
            <p
              className={cn(
                'text-base leading-5 font-semibold tabular-nums',
                day.workdays === 0 && (day.unpunched ? 'text-muted-foreground' : 'text-rose-700 dark:text-rose-400'),
              )}
            >
              {num(day.workdays)}
            </p>
            <p className="text-[11px] leading-4 text-muted-foreground">công</p>
          </>
        )}
        {day.overtime > 0 && (
          <p className="mt-1 text-xs font-semibold text-violet-700 tabular-nums dark:text-violet-400" title="Tăng ca (giờ)">
            +{formatOvertime(day.overtime)}h
          </p>
        )}
      </>
    )
  }
  if (!day.offlineMinutes && !day.onlineMinutes) return null
  return (
    <>
      {day.offlineMinutes > 0 && (
        <>
          <p className="text-sm leading-5 font-semibold tabular-nums">{formatDuration(day.offlineMinutes)}</p>
          <p className="text-[11px] leading-4 text-muted-foreground">offline</p>
        </>
      )}
      {day.onlineMinutes > 0 && (
        <p className="mt-1 text-xs font-semibold text-sky-700 tabular-nums dark:text-sky-400">{formatDuration(day.onlineMinutes)} online</p>
      )}
    </>
  )
}

/**
 * Một ngày trên điện thoại: ngày ở cột trái, từng ca một dòng ở giữa, công ở cột phải; ghi chú nằm ngay dưới
 * giờ để không phải vuốt ngang mới thấy. Ngày không chấm công chỉ hiện ghi chú, không lặp các gạch trống.
 */
function DayItem({ day, variant, thresholds, onDispute }: RowProps) {
  const sunday = isSunday(day.date)
  const notes = notesOf(day, thresholds, variant)
  const punched = day.shifts.some((s) => s.mode !== 'none' || s.missing)

  return (
    <li
      id={`ledger-${day.date}`}
      aria-current={day.isToday ? 'date' : undefined}
      className={cn('flex scroll-mt-32 gap-3 px-3 py-2.5', sunday && 'bg-muted/60', day.isToday && 'bg-primary/[0.04]')}
    >
      <div className="w-11 shrink-0 pt-0.5">
        <p className={cn('text-sm leading-5 font-semibold tabular-nums', day.isToday && 'text-primary')}>{formatDayMonth(day.date)}</p>
        <span
          className={cn(
            'mt-0.5 inline-block rounded px-1.5 text-[11px] leading-4 font-semibold',
            day.isToday ? 'bg-primary text-primary-foreground' : sunday ? 'bg-foreground/10 text-foreground' : 'bg-muted text-muted-foreground',
          )}
        >
          {weekdayShort(day.date)}
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        {punched && (
          <div>
            {day.shifts.map((s) => (
              <ShiftLine key={s.key} day={day} s={s} variant={variant} />
            ))}
          </div>
        )}
        {notes.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {notes.map((n) => (
              <NotePill key={n.text} {...n} />
            ))}
          </div>
        ) : (
          !punched && !sunday && <p className="pt-0.5 text-[13px] leading-5 text-muted-foreground">–</p>
        )}
        {onDispute && disputable(day) && (
          // Vùng bấm cao 40px trên cảm ứng; lề âm giữ khoảng cách dòng như cũ.
          <DisputeDayButton day={day} notes={notes} onDispute={onDispute} className="-ml-1.5 h-7 pointer-coarse:h-10" />
        )}
      </div>

      <div className="w-14 shrink-0 pt-0.5 text-right">
        <DayMetrics day={day} variant={variant} />
      </div>
    </li>
  )
}

/** Ô tiêu đề có biểu tượng phía trên chữ, gộp hai tầng. */
function IconHead({ icon: Icon, label, sub, className }: { icon: LucideIcon; label: string; sub?: string; className?: string }) {
  return (
    <th rowSpan={2} scope="col" className={cn(HEAD, HEAD_LINE_R, HEAD_LINE_B, 'py-2', className)}>
      <span className="flex flex-col items-center gap-1">
        <Icon className={HEAD_ICON} />
        <span>
          {label}
          {sub && <span className="ml-1 text-[11px] font-normal text-muted-foreground">({sub})</span>}
        </span>
      </span>
    </th>
  )
}

const FILTER_NOUN: Record<Exclude<LedgerFilter, 'all'>, string> = {
  attention: 'cần chú ý',
  overtime: 'có tăng ca',
  online: 'có ca online',
}

/** Bảng cần tối thiểu chừng này để mọi cột, kể cả Ghi chú, hiện đủ mà không cuộn ngang. */
const TABLE_MIN_WIDTH = 800

/**
 * Công theo ngày. Khung đủ rộng thì là bảng (Vào / Ra từng ca, công và tăng ca, ghi chú); hẹp hơn, như điện thoại,
 * tablet hay khi đứng cạnh cột phải, thì là danh sách mỗi ngày một dòng để ghi chú không bị đẩy khuất.
 */
export function DayLedger({
  variant,
  days,
  thresholds,
  filter,
  focus,
  onClearFilter,
  onDispute,
}: {
  variant: Variant
  days: LedgerDay[]
  thresholds: readonly number[]
  filter: LedgerFilter
  /** Yêu cầu cuộn tới từ thẻ tổng hợp (vd nút "Xem ngày" tăng ca). */
  focus: LedgerFocus | null
  onClearFilter: () => void
  /** Có khi tháng này còn báo sai được; mở hộp báo sai với nội dung điền sẵn. */
  onDispute?: (text: string) => void
}) {
  const visible = useMemo(() => applyFilter(days, filter), [days, filter])
  // Chỉ dựng một kiểu (bảng hoặc danh sách) để id của từng ngày không bị trùng.
  const [boxRef, boxWidth] = useElementWidth<HTMLDivElement>()
  const asTable = boxWidth >= TABLE_MIN_WIDTH

  useEffect(() => {
    if (!focus) return
    const id = requestAnimationFrame(() => {
      // Cuộn tới đầu mục (tiêu đề và bộ lọc) chứ không phải đầu danh sách, để thấy ngay đang lọc gì.
      const target = focus.ymd ? document.getElementById(`ledger-${focus.ymd}`) : document.getElementById('days-section')
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      target?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: focus.ymd ? 'center' : 'start' })
      // Đưa focus theo để bàn phím và trình đọc màn hình đi tiếp từ chỗ vừa cuộn tới.
      target?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(id)
  }, [focus])

  const shifts = days[0]?.shifts ?? []
  const metricCount = 2
  const colCount = 1 + shifts.length * 2 + metricCount + 1
  const emptyText =
    days.length === 0
      ? 'Tháng này chưa có ngày nào để hiện.'
      : filter === 'attention'
        ? 'Không có ngày nào cần chú ý.'
        : filter === 'overtime'
          ? 'Tháng này chưa có ngày tăng ca.'
          : 'Tháng này chưa có ca online.'

  return (
    <div ref={boxRef} id="day-ledger" className="space-y-2">
      {/* Luôn có trong DOM để trình đọc màn hình đọc lên mỗi khi đổi bộ lọc. */}
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg bg-muted/70 px-3 py-1.5 text-sm',
          filter === 'all' && 'sr-only',
        )}
      >
        <p role="status" aria-live="polite">
          {filter === 'all' ? `Đang xem tất cả ${days.length} ngày` : `Đang xem ${visible.length} ngày ${FILTER_NOUN[filter]}`}
        </p>
        {filter !== 'all' && (
          <button
            type="button"
            onClick={onClearFilter}
            className="inline-flex h-8 items-center rounded-md px-2 font-medium text-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none pointer-coarse:h-10"
          >
            Xem tất cả {days.length} ngày
          </button>
        )}
      </div>
      {!asTable ? (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          {visible.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">{emptyText}</p>
          ) : (
            <ul aria-label="Công theo ngày" className="divide-y divide-border/70">
              {visible.map((day) => (
                <DayItem key={day.date} day={day} variant={variant} thresholds={thresholds} onDispute={onDispute} />
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          {/* Chỉ cuộn ngang; cuộn dọc đi theo trang để không có hai thanh cuộn. */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[50rem] table-fixed border-separate border-spacing-0 text-sm">
              <colgroup>
                <col className="w-28" />
                {shifts.flatMap((s) => [<col key={`${s.key}-in`} />, <col key={`${s.key}-out`} />])}
                {Array.from({ length: metricCount }, (_, i) => (
                  <col key={`m${i}`} />
                ))}
                <col className="w-56" />
              </colgroup>
              <thead>
                <tr>
                  <th rowSpan={2} scope="col" className={cn(HEAD, HEAD_LINE_R, HEAD_LINE_B, DATE_COL, 'z-2 px-3 text-left')}>
                    <span className="flex items-center gap-2">
                      <CalendarDays className={HEAD_ICON} />
                      Ngày
                    </span>
                  </th>
                  {shifts.map((s) => {
                    const { icon: Icon, tone } = SHIFT_ICON[s.key]
                    return (
                      <th key={s.key} colSpan={2} scope="colgroup" className={cn(HEAD, HEAD_LINE_R, 'border-b border-b-border pt-2 pb-1.5')}>
                        <span className="flex items-center justify-center gap-1.5">
                          <Icon className={cn('size-4', tone)} />
                          {SHIFT_NAME[s.key]}
                          <span className="text-[11px] font-normal text-muted-foreground tabular-nums">
                            ({formatClockMinutes(s.window.start)} – {formatClockMinutes(s.window.end)})
                          </span>
                        </span>
                      </th>
                    )
                  })}
                  {variant === 'full_time' ? (
                    <>
                      <IconHead icon={BriefcaseBusiness} label="Công" />
                      <IconHead icon={TimerReset} label="Tăng ca" sub="giờ" />
                    </>
                  ) : (
                    <>
                      <IconHead icon={BriefcaseBusiness} label="Offline" />
                      <IconHead icon={Clock3} label="Online" />
                    </>
                  )}
                  <th rowSpan={2} scope="col" className={cn(HEAD, HEAD_LINE_B, 'px-3 text-left')}>
                    Ghi chú
                  </th>
                </tr>
                <tr>
                  {shifts.flatMap((s) => [
                    <th key={`${s.key}-in`} scope="col" className={cn(HEAD, HEAD_LINE_R, HEAD_LINE_B, 'py-1.5 text-xs font-medium text-muted-foreground')}>
                      Vào
                    </th>,
                    <th key={`${s.key}-out`} scope="col" className={cn(HEAD, HEAD_LINE_R, HEAD_LINE_B, 'py-1.5 text-xs font-medium text-muted-foreground')}>
                      Ra
                    </th>,
                  ])}
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={colCount} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      {emptyText}
                    </td>
                  </tr>
                ) : (
                  visible.map((day) => <DayRow key={day.date} day={day} variant={variant} thresholds={thresholds} onDispute={onDispute} />)
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {variant === 'full_time' && days.length > 0 && (
        <p className="flex items-start gap-1.5 px-1 text-xs leading-5 text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Công từng ngày là công máy: ca có giờ vào hoặc ra được 0,5 công, quên một mốc vẫn tính. Ngày "Chưa có công" có thể là
          ngày phép, lễ hay làm online; các khoản đó do quản lý nhập và đã cộng vào tổng công.
        </p>
      )}
    </div>
  )
}

