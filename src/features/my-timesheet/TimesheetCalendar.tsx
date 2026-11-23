import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { rangeLabel, weeksOfMonth } from '@/features/attendance-board/attendance-board.types'
import { formatOvertime } from '@/features/monthly-timesheets/monthly-timesheets.types'
import { formatClockMinutes, formatDayMonth, formatDuration, formatMonth, weekdayShort } from '@/lib/format'
import { cn } from '@/lib/utils'
import { SHIFT_NAME, filterDays, isSunday, type LedgerDay, type LedgerFilter, type LedgerShift } from './day-ledger'
import { daysOfMonth, leadingBlanks } from './day-status'
import {
  TONE_TEXT,
  UNPUNCHED_HINT,
  dayStatus,
  disputable,
  disputeDraft,
  mergedShift,
  periodSummary,
  slotView,
  strongestTone,
  timesLine,
  type LedgerVariant,
  type SlotView,
  type Tone,
} from './ledger-view'

type View = 'week' | 'month'

/** Yêu cầu từ ngoài lịch (bấm một chỉ số ở thẻ tổng công): cuộn tới lịch. `at` đổi mỗi lần bấm. */
export interface CalendarFocus {
  at: number
}

/** Một ngày của tuần đang xem; `day` null là ngày chưa tới. `outside`: ngày của tháng bên cạnh, chỉ để tuần đủ bảy dòng. */
interface WeekRow {
  date: string
  day: LedgerDay | null
  outside?: boolean
}

/** Bảy ngày Thứ Hai – Chủ nhật của tuần chứa `ymd`. */
function fullWeek(ymd: string): string[] {
  const monday = new Date(`${ymd}T00:00:00Z`)
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setUTCDate(monday.getUTCDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

/** Chấm màu của một ngày trên lịch tháng thu gọn (điện thoại); Chủ nhật không có chấm. */
const TONE_DOT: Record<Tone, string> = {
  error: 'bg-rose-500',
  warn: 'bg-amber-500',
  live: 'bg-primary',
  info: 'bg-sky-500',
  ot: 'bg-violet-500',
  ok: 'bg-emerald-500',
  muted: 'bg-muted-foreground/40',
}

/** Ngày cần xem lại thì tô nền, để lướt qua là thấy. */
const TONE_CELL: Partial<Record<Tone, string>> = {
  error: 'bg-rose-500/10',
  warn: 'bg-amber-500/12',
}

function dotTone(day: LedgerDay, variant: LedgerVariant): Tone | null {
  if (day.kind === 'sunday') return null
  const { tone } = dayStatus(day, variant)
  // Part-time và nửa ngày có trạng thái màu trung tính dù có làm; chấm xanh để phân biệt với ngày không làm.
  return tone === 'muted' && (day.workedMinutes ?? 0) > 0 ? 'ok' : tone
}

function legendLabel(tone: Tone, variant: LedgerVariant): string {
  const full = variant === 'full_time'
  const labels: Record<Tone, string> = {
    ok: full ? 'Có công' : 'Có làm',
    warn: 'Muộn, về sớm',
    error: full ? 'Quên chấm' : 'Thiếu giờ',
    muted: full ? 'Chưa có công' : 'Không làm',
    info: 'Online',
    ot: 'Tăng ca',
    live: 'Đang làm',
  }
  return labels[tone]
}

const LEGEND_ORDER: Tone[] = ['ok', 'ot', 'info', 'live', 'warn', 'error', 'muted']

/** Mở hộp báo sai với nội dung điền sẵn ngày và vấn đề của ngày đó. */
type OnDispute = (text: string) => void

const num = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })
const WEEKDAY_HEAD = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

const FILTER_LABEL: Record<Exclude<LedgerFilter, 'all'>, string> = {
  attention: 'Cần chú ý',
  overtime: 'Tăng ca',
  online: 'Online',
}

const FILTER_NOUN: Record<Exclude<LedgerFilter, 'all'>, string> = {
  attention: 'cần chú ý',
  overtime: 'có tăng ca',
  online: 'có ca online',
}

const FILTER_EMPTY: Record<Exclude<LedgerFilter, 'all'>, string> = {
  attention: 'Không có ngày nào cần chú ý.',
  overtime: 'Tháng này chưa có ngày tăng ca.',
  online: 'Tháng này chưa có ca online.',
}

const STATE_TEXT: Record<SlotView['state'], string> = {
  normal: 'text-foreground',
  off: 'font-semibold text-amber-700 dark:text-amber-400',
  missing: 'font-semibold text-rose-700 dark:text-rose-400',
  empty: 'text-muted-foreground/50',
}

const STATE_BG: Record<SlotView['state'], string> = {
  normal: '',
  off: 'bg-amber-500/8',
  missing: 'bg-rose-500/7',
  empty: '',
}

function ViewToggle({ value, onChange }: { value: View | null; onChange: (next: View) => void }) {
  const items: { value: View; label: string }[] = [
    { value: 'week', label: 'Tuần' },
    { value: 'month', label: 'Tháng' },
  ]
  return (
    <div role="group" aria-label="Kiểu xem" className="inline-flex h-8 items-center rounded-lg bg-muted p-0.75">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          aria-pressed={value === item.value}
          onClick={() => onChange(item.value)}
          className={cn(
            'h-full rounded-md px-3.5 text-[13px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
            value === item.value ? 'bg-background text-foreground shadow-sm' : 'text-foreground/60 hover:text-foreground',
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

function DateLabel({ date, today }: { date: string; today: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={cn('w-10 text-[13px] font-semibold tabular-nums', today && 'text-primary')}>{formatDayMonth(date)}</span>
      <span
        className={cn(
          'rounded px-1.5 text-[10px] leading-4 font-semibold',
          today ? 'bg-primary text-primary-foreground' : isSunday(date) ? 'bg-foreground/10 text-foreground' : 'bg-muted text-muted-foreground',
        )}
      >
        {weekdayShort(date)}
      </span>
    </span>
  )
}

function DisputeDayButton({ day, onDispute, className }: { day: LedgerDay; onDispute: OnDispute; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => onDispute(disputeDraft(day))}
      aria-label={`Báo sai ngày ${formatDayMonth(day.date)}`}
      className={cn(
        'inline-flex items-center rounded-md px-1.5 text-xs font-medium text-primary hover:bg-primary/10 hover:underline focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
        className,
      )}
    >
      Báo sai ngày này
    </button>
  )
}

/** Hai cấp kẻ như lib/table-lines: đậm giữa ngày, ca, cột số; nhạt giữa Vào và Ra của cùng một ca. */
const STRONG_LEFT = 'border-l border-l-foreground/20'
const SOFT_LEFT = 'border-l'

function TimeCell({ view, first }: { view: SlotView; first: boolean }) {
  return (
    <td
      title={view.title}
      className={cn('px-1 py-1.5 text-center', first ? STRONG_LEFT : SOFT_LEFT, STATE_BG[view.state])}
    >
      <span className={cn('block text-sm leading-5 tabular-nums', STATE_TEXT[view.state])}>{view.time}</span>
      {view.caption && (
        <span className={cn('block truncate text-[11px] leading-4 font-medium', TONE_TEXT[view.tone])}>{view.caption}</span>
      )}
    </td>
  )
}

function ShiftCells({ day, s, thresholds }: { day: LedgerDay; s: LedgerShift; thresholds: readonly number[] }) {
  const merged = mergedShift(s)
  if (merged) {
    return (
      <td colSpan={2} className={cn(STRONG_LEFT, 'px-1 py-1.5 text-center')}>
        <span className={cn('block text-sm leading-5 font-medium', TONE_TEXT[merged.tone])}>{merged.text}</span>
        {merged.caption && <span className="block text-[11px] leading-4 text-muted-foreground">{merged.caption}</span>}
      </td>
    )
  }
  return (
    <>
      <TimeCell view={slotView(day, s, 0, thresholds)} first />
      <TimeCell view={slotView(day, s, 1, thresholds)} first={false} />
    </>
  )
}

/** Hai ô cuối dòng: công và tăng ca (giờ) với full-time, giờ offline và online với part-time. */
function MetricCells({ variant, row }: { variant: LedgerVariant; row: WeekRow }) {
  const { date, day } = row
  const cell = cn(STRONG_LEFT, 'text-center text-sm font-semibold tabular-nums')
  const dash = <span className="font-normal text-muted-foreground/50">–</span>
  if (!day) {
    return (
      <>
        <td className={cell} />
        <td className={cell} />
      </>
    )
  }
  if (variant === 'full_time') {
    const workdays = day.workdays ?? (isSunday(date) || day.isToday ? null : 0)
    return (
      <>
        {/* Ngày chưa có công có thể là phép, lễ do quản lý nhập, nên số 0 không tô đỏ. */}
        <td className={cn(cell, workdays === 0 && !day.unpunched && 'text-rose-700 dark:text-rose-400')}>{workdays == null ? dash : num(workdays)}</td>
        <td className={cn(cell, 'text-violet-700 dark:text-violet-400')}>{day.overtime > 0 ? formatOvertime(day.overtime) : dash}</td>
      </>
    )
  }
  return (
    <>
      <td className={cn(cell, 'font-medium')}>{day.offlineMinutes ? formatDuration(day.offlineMinutes) : dash}</td>
      <td className={cn(cell, 'font-medium text-sky-700 dark:text-sky-400')}>{day.onlineMinutes ? formatDuration(day.onlineMinutes) : dash}</td>
    </>
  )
}

/** Bảng tuần trên màn rộng: mỗi ca hai cột Vào, Ra; lời ghi chú (muộn, quên chấm, quản lý bổ sung…) nằm ngay dưới giờ. */
function WeekTable({
  variant,
  rows,
  shifts,
  thresholds,
  focusDate,
  fill,
  className,
}: {
  variant: LedgerVariant
  rows: WeekRow[]
  shifts: LedgerShift[]
  thresholds: readonly number[]
  focusDate: string | null
  /** Giãn các dòng cho kín khung lịch (khi lịch được kéo cao bằng màn hình). */
  fill?: boolean
  className?: string
}) {
  const metrics = variant === 'full_time' ? ['Công', 'Tăng ca'] : ['Offline', 'Online']
  const head = 'border-b border-b-foreground/20'
  return (
    <div className={cn('overflow-x-auto', fill && 'h-full', className)}>
      <table className={cn('w-full min-w-176 table-fixed border-collapse text-sm', fill && 'h-full')}>
        <colgroup>
          <col className="w-28" />
          {shifts.flatMap((s) => [<col key={`${s.key}-in`} />, <col key={`${s.key}-out`} />])}
          <col className="w-20" />
          <col className="w-24" />
        </colgroup>
        <thead className="bg-muted/60 text-[13px]">
          <tr>
            <th rowSpan={2} scope="col" className={cn(head, 'px-3 text-center font-semibold')}>
              Ngày
            </th>
            {shifts.map((s) => (
              <th
                key={s.key}
                colSpan={2}
                scope="colgroup"
                className={cn(STRONG_LEFT, 'px-2 pt-2 pb-0.5 text-center font-semibold whitespace-nowrap')}
              >
                Ca {SHIFT_NAME[s.key].toLowerCase()}{' '}
                <span className="font-normal text-muted-foreground tabular-nums">
                  {formatClockMinutes(s.window.start)} – {formatClockMinutes(s.window.end)}
                </span>
              </th>
            ))}
            <th rowSpan={2} scope="col" className={cn(head, STRONG_LEFT, 'font-semibold')}>
              {metrics[0]}
            </th>
            <th rowSpan={2} scope="col" className={cn(head, STRONG_LEFT, 'font-semibold')}>
              {metrics[1]}
              {variant === 'full_time' && <span className="ml-1 text-[11px] font-normal text-muted-foreground">(giờ)</span>}
            </th>
          </tr>
          <tr>
            {shifts.flatMap((s) => [
              <th key={`${s.key}-in`} scope="col" className={cn(head, STRONG_LEFT, 'pt-0.5 pb-2 text-xs font-medium text-muted-foreground')}>
                Vào
              </th>,
              <th key={`${s.key}-out`} scope="col" className={cn(head, SOFT_LEFT, 'pt-0.5 pb-2 text-xs font-medium text-muted-foreground')}>
                Ra
              </th>,
            ])}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const { date, day } = row
            if (row.outside) {
              return (
                <tr key={date} className="h-13 border-b border-b-foreground/20 bg-muted/30 last:border-b-0">
                  <th scope="row" className="px-3 text-center font-normal opacity-45">
                    <DateLabel date={date} today={false} />
                  </th>
                  <td colSpan={shifts.length * 2} className={cn(STRONG_LEFT, 'text-center text-[13px] text-muted-foreground/70')}>
                    Thuộc {formatMonth(date.slice(0, 7)).toLowerCase()}
                  </td>
                  <td className={STRONG_LEFT} />
                  <td className={STRONG_LEFT} />
                </tr>
              )
            }
            const hasTimes = !!day && day.shifts.some((s) => s.mode !== 'none')
            const status = day ? dayStatus(day, variant) : null
            const label = !day ? 'Chưa tới' : day.kind === 'sunday' ? 'Chủ nhật · nghỉ' : status!.text
            return (
              <tr
                key={date}
                data-day={date}
                className={cn(
                  'h-13 border-b border-b-foreground/20 transition-colors last:border-b-0',
                  isSunday(date) && 'bg-muted/40',
                  !day && 'opacity-55',
                  focusDate === date && 'bg-primary/6',
                )}
              >
                <th scope="row" className="px-3 text-center font-normal">
                  <DateLabel date={date} today={!!day?.isToday} />
                </th>
                {hasTimes ? (
                  day!.shifts.map((s) => <ShiftCells key={s.key} day={day!} s={s} thresholds={thresholds} />)
                ) : (
                  <td
                    colSpan={shifts.length * 2}
                    title={day?.unpunched ? UNPUNCHED_HINT : undefined}
                    className={cn(STRONG_LEFT, 'text-center text-[13px]', day ? TONE_TEXT[status!.tone] : 'text-muted-foreground')}
                  >
                    {label}
                  </td>
                )}
                <MetricCells variant={variant} row={row} />
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** Một dòng ca trên điện thoại: "Sáng 08:20 → --:--   muộn 20p · M2, quên ra". */
function ShiftLine({ day, s, thresholds }: { day: LedgerDay; s: LedgerShift; thresholds: readonly number[] }) {
  const merged = mergedShift(s)
  const views = merged ? null : [slotView(day, s, 0, thresholds), slotView(day, s, 1, thresholds)]
  const notes = views ? views.flatMap((v) => (v.short ? [v.short] : [])) : merged?.caption ? [merged.caption] : []
  const tone = views ? strongestTone(views.filter((v) => v.short).map((v) => v.tone)) : 'muted'
  return (
    <div className="mt-1.5 flex items-baseline gap-3 text-sm">
      <span className="w-10 shrink-0 text-xs text-muted-foreground">{SHIFT_NAME[s.key]}</span>
      {views ? (
        <span className="shrink-0 tabular-nums">
          <span className={STATE_TEXT[views[0].state]}>{views[0].time}</span>
          <span className="text-muted-foreground/60"> → </span>
          <span className={STATE_TEXT[views[1].state]}>{views[1].time}</span>
        </span>
      ) : (
        <span className={cn('shrink-0 font-medium', TONE_TEXT[merged!.tone])}>{merged!.text}</span>
      )}
      {notes.length > 0 && <span className={cn('min-w-0 flex-1 text-right text-xs font-medium', TONE_TEXT[tone])}>{notes.join(', ')}</span>}
    </div>
  )
}

/** Tuần trên điện thoại: mỗi ngày một khối, mỗi ca một dòng, không phải cuộn ngang. */
function WeekList({
  variant,
  rows,
  thresholds,
  focusDate,
  onDispute,
  className,
}: {
  variant: LedgerVariant
  rows: WeekRow[]
  thresholds: readonly number[]
  focusDate: string | null
  onDispute?: OnDispute
  className?: string
}) {
  return (
    <ul className={cn('divide-y divide-foreground/15', className)}>
      {rows.map(({ date, day }) => {
        const status = day ? dayStatus(day, variant) : { text: 'Chưa tới', tone: 'muted' as const }
        const active = day?.shifts.filter((s) => s.mode !== 'none') ?? []
        const metric = !day
          ? ''
          : variant === 'full_time'
            ? day.workdays != null
              ? `${num(day.workdays)} công`
              : ''
            : day.workedMinutes
              ? formatDuration(day.workedMinutes)
              : ''
        return (
          <li
            key={date}
            data-day={date}
            className={cn('px-4 py-3', isSunday(date) && 'bg-muted/40', !day && 'opacity-55', focusDate === date && 'bg-primary/6')}
          >
            <div className="flex items-center gap-2">
              <DateLabel date={date} today={!!day?.isToday} />
              <span title={day?.unpunched ? UNPUNCHED_HINT : undefined} className={cn('text-xs font-medium', TONE_TEXT[status.tone])}>
                {status.text}
              </span>
              {metric && <span className="ml-auto text-[13px] font-semibold tabular-nums">{metric}</span>}
            </div>
            {day && active.map((s) => <ShiftLine key={s.key} day={day} s={s} thresholds={thresholds} />)}
            {day && onDispute && disputable(day) && (
              <DisputeDayButton day={day} onDispute={onDispute} className="mt-1 -ml-1.5 h-7 pointer-coarse:h-10" />
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** Cả tháng dạng lịch 7 cột: mỗi ô có giờ vào đầu, giờ ra cuối và trạng thái; bấm để mở tuần của ngày đó. */
function MonthGrid({
  variant,
  month,
  today,
  byDate,
  onOpen,
}: {
  variant: LedgerVariant
  month: string
  today: string
  byDate: Map<string, LedgerDay>
  onOpen: (date: string) => void
}) {
  const weekCount = Math.ceil((leadingBlanks(month) + daysOfMonth(month).length) / 7)
  return (
    <div className="hidden h-full overflow-x-auto p-3 sm:block">
      <div
        className="grid h-full min-w-144 grid-cols-7 gap-1.5"
        style={{ gridTemplateRows: `auto repeat(${weekCount}, minmax(5rem, 1fr))` }}
      >
        {WEEKDAY_HEAD.map((h) => (
          <div key={h} className="pb-1 text-center text-[11px] font-semibold text-muted-foreground">
            {h}
          </div>
        ))}
        {Array.from({ length: leadingBlanks(month) }, (_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {daysOfMonth(month).map((date) => {
          const day = byDate.get(date)
          const status = day ? dayStatus(day, variant) : null
          return (
            <button
              key={date}
              type="button"
              disabled={!day}
              onClick={() => onOpen(date)}
              aria-label={`${weekdayShort(date)} ${formatDayMonth(date)}${status ? `: ${status.text}` : ''}`}
              className={cn(
                'flex min-w-0 flex-col gap-1 rounded-lg border border-foreground/20 bg-card p-2 text-left transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
                isSunday(date) && 'bg-muted/40',
              )}
            >
              <span className={cn('text-[13px] font-semibold tabular-nums', date === today && 'text-primary')}>{Number(date.slice(8))}</span>
              <span className="truncate text-xs text-foreground/80 tabular-nums">{day ? timesLine(day) : ''}</span>
              {status && <span className={cn('truncate text-[11px] font-medium', TONE_TEXT[status.tone])}>{status.text}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Cả tháng trên điện thoại: lưới bảy cột vừa màn hình, mỗi ngày một số và một chấm trạng thái; ngày cần xem lại tô nền.
 * Chạm một ngày để xem chi tiết ngay bên dưới, không phải rời khỏi lịch tháng.
 */
function CompactMonth({
  variant,
  month,
  today,
  byDate,
  picked,
  onPick,
  thresholds,
  onDispute,
  onOpenWeek,
}: {
  variant: LedgerVariant
  month: string
  today: string
  byDate: Map<string, LedgerDay>
  picked: string | null
  onPick: (date: string) => void
  thresholds: readonly number[]
  onDispute?: OnDispute
  onOpenWeek: (date: string) => void
}) {
  const tones = new Set<Tone>()
  for (const day of byDate.values()) {
    const tone = dotTone(day, variant)
    if (tone) tones.add(tone)
  }
  const pickedDay = picked ? (byDate.get(picked) ?? null) : null

  return (
    <div className="sm:hidden">
      <div className="px-3 pt-3 pb-2">
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAY_HEAD.map((h) => (
            <div key={h} className="pb-1 text-center text-[11px] font-semibold text-muted-foreground">
              {h}
            </div>
          ))}
          {Array.from({ length: leadingBlanks(month) }, (_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {daysOfMonth(month).map((date) => {
            const day = byDate.get(date)
            const tone = day ? dotTone(day, variant) : null
            const status = day ? dayStatus(day, variant) : null
            const selected = picked === date
            return (
              <button
                key={date}
                type="button"
                disabled={!day}
                aria-pressed={selected}
                onClick={() => onPick(date)}
                aria-label={`${weekdayShort(date)} ${formatDayMonth(date)}${status ? `: ${status.text}` : ''}`}
                className={cn(
                  'flex h-12 flex-col items-center justify-center gap-1 rounded-lg text-sm font-semibold tabular-nums transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-40',
                  tone && TONE_CELL[tone],
                  isSunday(date) && 'text-muted-foreground',
                  date === today && 'text-primary',
                  selected && 'ring-2 ring-primary ring-inset',
                )}
              >
                {Number(date.slice(8))}
                <span aria-hidden="true" className={cn('size-1.5 rounded-full', tone ? TONE_DOT[tone] : 'bg-transparent')} />
              </button>
            )
          })}
        </div>
        {tones.size > 0 && (
          <ul aria-label="Chú thích màu" className="flex flex-wrap justify-center gap-x-3 gap-y-1 pt-2.5 text-[11px] text-muted-foreground">
            {LEGEND_ORDER.filter((t) => tones.has(t)).map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={cn('size-1.5 rounded-full', TONE_DOT[t])} />
                {legendLabel(t, variant)}
              </li>
            ))}
          </ul>
        )}
      </div>
      {picked && pickedDay && (
        <div className="border-t border-t-foreground/15">
          <WeekList variant={variant} rows={[{ date: picked, day: pickedDay }]} thresholds={thresholds} focusDate={null} onDispute={onDispute} />
          <div className="-mt-1 flex justify-end px-2.5 pb-1.5">
            <button
              type="button"
              onClick={() => onOpenWeek(picked)}
              className="inline-flex h-10 items-center gap-0.5 rounded-md px-1.5 text-xs font-medium text-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              Xem cả tuần
              <ChevronRight className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Lịch chấm công của tháng. Xem theo tuần (mặc định là tuần có hôm nay, ngày chưa tới hiện mờ) hoặc cả tháng dạng lịch.
 * Bấm một chỉ số ở thẻ tổng công thì lịch chỉ hiện các ngày đó (`filter`), bỏ lọc bằng nút ✕ hoặc chọn lại Tuần, Tháng.
 * Đổi tháng thì trang dựng lại component này (`key` theo tháng) để về tuần mặc định.
 */
export function TimesheetCalendar({
  variant,
  month,
  today,
  days,
  thresholds,
  filter,
  onFilterChange,
  focus,
  onDispute,
  className,
}: {
  variant: LedgerVariant
  month: string
  today: string
  /** Các ngày tới hôm nay của tháng. */
  days: LedgerDay[]
  thresholds: readonly number[]
  filter: LedgerFilter
  onFilterChange: (next: LedgerFilter) => void
  /** Yêu cầu cuộn tới lịch từ thẻ tổng công. */
  focus: CalendarFocus | null
  /** Có khi tháng này còn báo sai được. */
  onDispute?: OnDispute
  /** Vd `flex-1` để lịch kéo cao bằng cột bên cạnh; bảng tuần và lưới tháng giãn theo. */
  className?: string
}) {
  /** Tuần thứ Hai – Chủ nhật, cắt theo tháng; chỉ các tuần đã bắt đầu. */
  const weeks = useMemo(() => weeksOfMonth(month).filter((w) => w.days[0] <= today), [month, today])
  const [view, setView] = useState<View>('week')
  const [weekIndex, setWeekIndex] = useState(() => Math.max(0, weeks.findIndex((w) => w.days.includes(today))))
  /** Ngày vừa mở từ lịch tháng: cuộn tới và tô nhẹ dòng của ngày đó. */
  const [opened, setOpened] = useState<{ date: string; at: number } | null>(null)
  /** Ngày đang xem chi tiết ở lịch tháng thu gọn (điện thoại): mặc định hôm nay, tháng đã qua thì ngày cuối. */
  const [picked, setPicked] = useState<string | null>(() => days.find((d) => d.isToday)?.date ?? days[days.length - 1]?.date ?? null)

  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days])
  const filtered = useMemo(() => filterDays(days, filter), [days, filter])
  const week = weeks[Math.min(weekIndex, weeks.length - 1)]
  const shifts = days[0]?.shifts ?? []

  useEffect(() => {
    if (!opened) return
    const id = requestAnimationFrame(() => {
      const target = [...document.querySelectorAll<HTMLElement>(`[data-day="${opened.date}"]`)].find((el) => el.offsetParent !== null)
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    return () => cancelAnimationFrame(id)
  }, [opened])

  useEffect(() => {
    if (!focus) return
    const id = requestAnimationFrame(() => {
      // Cuộn tới đầu lịch (tiêu đề và bộ lọc) để thấy ngay đang lọc gì.
      const target = document.getElementById('days-section')
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      target?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
      // Đưa focus theo để bàn phím và trình đọc màn hình đi tiếp từ chỗ vừa cuộn tới.
      target?.focus({ preventScroll: true })
    })
    return () => cancelAnimationFrame(id)
  }, [focus])

  function changeView(next: View) {
    if (filter !== 'all') onFilterChange('all')
    setView(next)
  }

  function openDay(date: string) {
    const index = weeks.findIndex((w) => w.days.includes(date))
    if (index >= 0) setWeekIndex(index)
    setView('week')
    setOpened({ date, at: Date.now() })
  }

  function moveWeek(delta: number) {
    setWeekIndex((i) => Math.min(Math.max(i + delta, 0), weeks.length - 1))
    setOpened(null)
  }

  const filtering = filter !== 'all'
  const showWeek = !filtering && view === 'week' && !!week
  const rows: WeekRow[] = filtering
    ? filtered.map((day) => ({ date: day.date, day }))
    : (week?.days ?? []).map((date) => ({ date, day: byDate.get(date) ?? null }))
  /** Bảng tuần trên màn rộng luôn đủ bảy dòng, kể cả tuần đầu và cuối tháng, để lịch không co giãn khi đổi tuần. */
  const tableRows: WeekRow[] =
    showWeek && week.days.length < 7
      ? fullWeek(week.days[0]).map((date) =>
          week.days.includes(date) ? { date, day: byDate.get(date) ?? null } : { date, day: null, outside: true },
        )
      : rows
  const shown = filtering ? filtered : showWeek ? rows.flatMap((r) => (r.day ? [r.day] : [])) : days
  const label = filtering ? `${filtered.length} ngày ${FILTER_NOUN[filter]}` : showWeek ? `Tuần ${week.index + 1}` : formatMonth(month)
  const focusDate = filtering ? null : (opened?.date ?? null)

  return (
    <section
      id="days-section"
      tabIndex={-1}
      aria-labelledby="timesheet-calendar"
      className={cn(
        'flex scroll-mt-32 flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/20 outline-none md:scroll-mt-20',
        className,
      )}
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-b-foreground/20 px-4 py-3">
        <div className="min-w-0">
          <h2 id="timesheet-calendar" className="text-base font-semibold">
            Lịch chấm công
          </h2>
          {/* Luôn có trong DOM để trình đọc màn hình đọc lên mỗi khi đổi bộ lọc. */}
          <p role="status" aria-live="polite" className="text-[13px] text-muted-foreground tabular-nums">
            {filtering
              ? `Đang xem ${filtered.length} ngày ${FILTER_NOUN[filter]} trong ${formatMonth(month).toLowerCase()}`
              : showWeek
                ? `Tuần ${week.index + 1} · ${rangeLabel(week.days)} · ghi chú nằm ngay dưới giờ chấm`
                : (
                  <>
                    <span className="hidden sm:inline">Bấm một ngày để mở tuần của ngày đó</span>
                    <span className="sm:hidden">Chạm một ngày để xem chi tiết</span>
                  </>
                )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle value={filtering ? null : view} onChange={changeView} />
          {filtering && (
            <span className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary/10 pr-1 pl-3 text-[13px] font-medium text-primary">
              {FILTER_LABEL[filter]} · {filtered.length}
              <button
                type="button"
                aria-label="Bỏ lọc, xem lại lịch"
                onClick={() => onFilterChange('all')}
                className="grid size-6 place-items-center rounded-md hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <X className="size-3.5" />
              </button>
            </span>
          )}
          {showWeek && (
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon-sm" aria-label="Tuần trước" disabled={weekIndex <= 0} onClick={() => moveWeek(-1)}>
                <ChevronLeft />
              </Button>
              <span className="min-w-32 text-center text-[13px] font-semibold tabular-nums">
                Tuần {week.index + 1} · {rangeLabel(week.days)}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Tuần sau"
                disabled={weekIndex >= weeks.length - 1}
                onClick={() => moveWeek(1)}
              >
                <ChevronRight />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Thân lịch chiếm phần còn lại để chân lịch luôn nằm ở đáy khung. */}
      <div className="flex min-h-0 flex-1 flex-col">
        {filtering && rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">{FILTER_EMPTY[filter]}</p>
        ) : filtering || showWeek ? (
          <>
            <WeekTable
              className="hidden sm:block"
              variant={variant}
              rows={tableRows}
              shifts={shifts}
              thresholds={thresholds}
              focusDate={focusDate}
              // Khi lọc chỉ còn vài ngày: giữ cao dòng tự nhiên, không kéo giãn.
              fill={showWeek}
            />
            <WeekList className="sm:hidden" variant={variant} rows={rows} thresholds={thresholds} focusDate={focusDate} onDispute={onDispute} />
            {filtering && (
              <div className="flex flex-1 flex-col items-center justify-center gap-1 border-t border-t-foreground/15 px-4 py-6 text-center text-[13px] text-muted-foreground">
                <p>
                  Chỉ hiện {filtered.length} ngày {FILTER_NOUN[filter]}.
                </p>
                <button
                  type="button"
                  onClick={() => onFilterChange('all')}
                  className="inline-flex h-9 items-center rounded-md px-2 font-medium text-primary hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  Xem lại lịch {view === 'week' ? 'tuần' : 'tháng'}
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <MonthGrid variant={variant} month={month} today={today} byDate={byDate} onOpen={openDay} />
            <CompactMonth
              variant={variant}
              month={month}
              today={today}
              byDate={byDate}
              picked={picked}
              onPick={setPicked}
              thresholds={thresholds}
              onDispute={onDispute}
              onOpenWeek={openDay}
            />
          </>
        )}
      </div>

      <p className="shrink-0 border-t border-t-foreground/20 bg-muted/30 px-4 py-2.5 text-[13px] tabular-nums">{periodSummary(shown, variant, label)}</p>
    </section>
  )
}
