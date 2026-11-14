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
}: {
  variant: Variant
  days: LedgerDay[]
  value: LedgerFilter
  onChange: (next: LedgerFilter) => void
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
    <div role="group" aria-label="Lọc ngày" className="inline-flex h-9 items-center rounded-lg bg-muted p-[3px]">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          aria-pressed={value === item.value}
          onClick={() => onChange(item.value)}
          title={item.value === 'attention' ? 'Ngày có đi muộn, về sớm hoặc thiếu giờ vào, ra' : undefined}
          className={cn(
            'h-full rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
            value === item.value ? 'bg-background text-foreground shadow-sm' : 'text-foreground/60 hover:text-foreground',
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

function Dash() {
  return <span className="text-muted-foreground/50">–</span>
}

/** Ô giờ: giờ chấm (muộn, sớm thì có nền cam), "--:--" nền đỏ khi thiếu mốc, gạch khi không có; chấm xanh khi quản lý đã sửa. */
function SlotCell({ iso, missing, off, adjusted, className }: { iso: string | null; missing: boolean; off: boolean; adjusted: boolean; className?: string }) {
  return (
    <td className={cn(ROW, LINE_R, 'px-1 text-center text-[13px] tabular-nums', className)}>
      {iso ? (
        <span className="relative inline-flex items-center">
          <span className={cn(off && 'rounded-md bg-amber-500/15 px-1.5 py-0.5 font-semibold text-amber-700 dark:text-amber-400')}>
            {formatTime(iso)}
          </span>
          {adjusted && <i title="Quản lý đã bổ sung giờ" className="absolute -right-2.5 size-1.5 rounded-full bg-sky-500" />}
        </span>
      ) : missing ? (
        <span className="rounded-md bg-rose-500/10 px-1.5 py-0.5 font-semibold text-rose-700 dark:text-rose-400">--:--</span>
      ) : (
        <Dash />
      )}
    </td>
  )
}

/** Hai ô Vào, Ra của một ca. Ca online hoặc giờ bổ sung không có giờ cụ thể thì gộp thành một ô. */
function ShiftCells({ day, s }: { day: LedgerDay; s: LedgerShift }) {
  if (s.mode === 'online') {
    return (
      <td colSpan={2} className={cn(ROW, LINE_R, 'px-1 text-center')}>
        <span className="rounded-md bg-sky-500/10 px-1.5 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-400">
          Online {s.workedMinutes ? formatDuration(s.workedMinutes) : ''}
        </span>
      </td>
    )
  }
  if (s.mode !== 'none' && !s.inAt && !s.outAt && s.workedMinutes) {
    return (
      <td colSpan={2} className={cn(ROW, LINE_R, 'px-1 text-center text-xs text-muted-foreground')}>
        Bổ sung {formatDuration(s.workedMinutes)}
      </td>
    )
  }
  // Không chấm trưa: ra sáng và vào chiều trống nhưng không phải thiếu mốc.
  const outAt = day.noLunch && s.key === 'morning' ? null : s.outAt
  return (
    <>
      <SlotCell iso={s.inAt} missing={s.missing && !s.inAt} off={s.lateMinutes > 0} adjusted={slotAdjusted(day, s.key, 0, s.inAt)} />
      <SlotCell iso={outAt} missing={s.missing && !s.outAt} off={s.earlyMinutes > 0} adjusted={slotAdjusted(day, s.key, 1, outAt)} />
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

function notesOf(day: LedgerDay, thresholds: readonly number[]): Note[] {
  const notes: Note[] = []
  for (const s of day.shifts) {
    const shift = SHIFT_NAME[s.key].toLowerCase()
    if (s.missing) notes.push({ text: `Thiếu giờ ${s.inAt ? 'ra' : 'vào'} ${shift}`, kind: 'error' })
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
  if (day.kind === 'absent') notes.push({ text: day.isToday ? 'Hôm nay chưa chấm công' : 'Không có lượt chấm công', kind: 'muted' })
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

function DayRow({ day, variant, thresholds }: { day: LedgerDay; variant: Variant; thresholds: readonly number[] }) {
  const sunday = isSunday(day.date)
  const notes = notesOf(day, thresholds)

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
              'rounded px-1.5 text-[10px] leading-4 font-semibold',
              day.isToday ? 'bg-primary text-primary-foreground' : sunday ? 'bg-foreground/10 text-foreground' : 'bg-muted text-muted-foreground',
            )}
          >
            {weekdayShort(day.date)}
          </span>
        </span>
      </th>

      {day.shifts.map((s) => (
        <ShiftCells key={s.key} day={day} s={s} />
      ))}

      {variant === 'full_time' ? (
        <>
          <td className={cn(ROW, LINE_R, 'px-2 text-center text-[13px] font-semibold tabular-nums')}>
            {day.workdays != null ? (
              <span className={cn(day.workdays === 0 && 'text-rose-700 dark:text-rose-400')}>{num(day.workdays)}</span>
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
        </span>
      </td>
    </tr>
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

/** Một số trong thanh tổng ở chân bảng. */
function FooterStat({ icon: Icon, label, value, tone }: { icon: LucideIcon; label: string; value: string; tone?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground/70">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn('text-lg leading-6 font-semibold tracking-tight tabular-nums', tone)}>{value}</p>
      </div>
    </div>
  )
}

/**
 * Bảng công theo ngày: đầu bảng có biểu tượng, mỗi dòng một ngày với Vào / Ra của từng ca, công và tăng ca (giờ)
 * với toàn thời gian, giờ offline / online với part-time, và ghi chú dạng nhãn; chân bảng là thanh tổng.
 */
export function DayLedger({
  variant,
  days,
  thresholds,
  filter,
  focus,
}: {
  variant: Variant
  days: LedgerDay[]
  thresholds: readonly number[]
  filter: LedgerFilter
  /** Yêu cầu cuộn tới từ thẻ tổng hợp (vd nút "Xem ngày" tăng ca). */
  focus: LedgerFocus | null
}) {
  const visible = useMemo(() => applyFilter(days, filter), [days, filter])

  const totals = useMemo(
    () => ({
      worked: days.reduce((n, d) => n + (d.workedMinutes ?? 0), 0),
      workdays: Math.round(days.reduce((n, d) => n + (d.workdays ?? 0), 0) * 100) / 100,
      overtime: Math.round(days.reduce((n, d) => n + d.overtime, 0) * 1000) / 1000,
      offline: days.reduce((n, d) => n + d.offlineMinutes, 0),
      online: days.reduce((n, d) => n + d.onlineMinutes, 0),
      attention: days.filter(needsAttention).length,
    }),
    [days],
  )

  useEffect(() => {
    if (!focus) return
    const id = requestAnimationFrame(() => {
      const target = focus.ymd ? document.getElementById(`ledger-${focus.ymd}`) : document.getElementById('day-ledger')
      target?.scrollIntoView({ behavior: 'smooth', block: focus.ymd ? 'center' : 'start' })
    })
    return () => cancelAnimationFrame(id)
  }, [focus])

  const shifts = days[0]?.shifts ?? []
  const metricCount = 2
  const colCount = 1 + shifts.length * 2 + metricCount + 1

  return (
    <div id="day-ledger" className="scroll-mt-20 space-y-3">
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
                    {days.length === 0
                      ? 'Tháng này chưa có ngày nào để hiện.'
                      : filter === 'attention'
                        ? 'Không có ngày nào đi muộn, về sớm hay thiếu giờ vào, ra.'
                        : filter === 'overtime'
                          ? 'Tháng này chưa có ngày tăng ca.'
                          : 'Tháng này chưa có ca online.'}
                  </td>
                </tr>
              ) : (
                visible.map((day) => <DayRow key={day.date} day={day} variant={variant} thresholds={thresholds} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      {days.length > 0 && (
        <div
          className={cn(
            'grid items-center gap-x-6 gap-y-4 rounded-xl bg-card px-4 py-3 ring-1 ring-foreground/10 sm:grid-cols-2',
            variant === 'full_time' ? 'lg:grid-cols-[auto_auto_minmax(0,1fr)]' : 'lg:grid-cols-[auto_auto_auto_minmax(0,1fr)]',
          )}
        >
          {variant === 'full_time' ? (
            <>
              <FooterStat icon={CalendarDays} label="Tổng công máy" value={`${num(totals.workdays)} công`} />
              <FooterStat
                icon={TimerReset}
                label="Tăng ca"
                value={`${formatOvertime(totals.overtime)} giờ`}
                tone={totals.overtime > 0 ? 'text-violet-700 dark:text-violet-400' : undefined}
              />
            </>
          ) : (
            <>
              <FooterStat icon={Clock3} label="Tổng giờ làm" value={formatDuration(totals.worked)} />
              <FooterStat icon={BriefcaseBusiness} label="Offline" value={formatDuration(totals.offline)} />
              <FooterStat icon={Clock3} label="Online" value={formatDuration(totals.online)} tone="text-sky-700 dark:text-sky-400" />
            </>
          )}
          <div className="flex min-w-0 items-start gap-2.5 rounded-lg bg-muted/60 px-3 py-2.5 sm:col-span-2 lg:col-span-1">
            <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 text-[13px] leading-snug">
              <p className="font-medium">Ghi chú chung</p>
              <p className="text-muted-foreground">
                {totals.attention > 0
                  ? `Có ${totals.attention} ngày đi muộn, về sớm hoặc thiếu giờ vào, ra, xem ở cột Ghi chú.`
                  : 'Tháng này không có ngày đi muộn, về sớm hay thiếu giờ vào, ra.'}
                {variant === 'full_time' && ' Công máy chưa gồm làm online, lễ và phép.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

