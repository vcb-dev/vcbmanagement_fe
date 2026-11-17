import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { rangeLabel, weeksOfMonth } from '@/features/attendance-board/attendance-board.types'
import { formatOvertime } from '@/features/monthly-timesheets/monthly-timesheets.types'
import { formatClockMinutes, formatDayMonth, formatDuration, formatMonth, weekdayShort } from '@/lib/format'
import { cn } from '@/lib/utils'
import { SHIFT_NAME, isSunday, type LedgerDay, type LedgerShift } from './day-ledger'
import { daysOfMonth, leadingBlanks } from './day-status'
import {
  TONE_TEXT,
  dayStatus,
  mergedShift,
  periodSummary,
  slotView,
  strongestTone,
  timesLine,
  type LedgerVariant,
  type SlotView,
} from './ledger-view'

type View = 'week' | 'month'

/** Một ngày của tuần đang xem; `day` null là ngày chưa tới. */
interface WeekRow {
  date: string
  day: LedgerDay | null
}

const num = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })
const WEEKDAY_HEAD = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

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

function ViewToggle({ value, onChange }: { value: View; onChange: (next: View) => void }) {
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
    <span className="flex items-center gap-2">
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
        <td className={cn(cell, workdays === 0 && 'text-rose-700 dark:text-rose-400')}>{workdays == null ? dash : num(workdays)}</td>
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
  className,
}: {
  variant: LedgerVariant
  rows: WeekRow[]
  shifts: LedgerShift[]
  thresholds: readonly number[]
  focusDate: string | null
  className?: string
}) {
  const metrics = variant === 'full_time' ? ['Công', 'Tăng ca'] : ['Offline', 'Online']
  const head = 'border-b border-b-foreground/20'
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full min-w-176 table-fixed border-collapse text-sm">
        <colgroup>
          <col className="w-28" />
          {shifts.flatMap((s) => [<col key={`${s.key}-in`} />, <col key={`${s.key}-out`} />])}
          <col className="w-20" />
          <col className="w-24" />
        </colgroup>
        <thead className="bg-muted/60 text-[13px]">
          <tr>
            <th rowSpan={2} scope="col" className={cn(head, 'px-3 text-left font-semibold')}>
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
                <th scope="row" className="px-3 text-left font-normal">
                  <DateLabel date={date} today={!!day?.isToday} />
                </th>
                {hasTimes ? (
                  day!.shifts.map((s) => <ShiftCells key={s.key} day={day!} s={s} thresholds={thresholds} />)
                ) : (
                  <td
                    colSpan={shifts.length * 2}
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
  className,
}: {
  variant: LedgerVariant
  rows: WeekRow[]
  thresholds: readonly number[]
  focusDate: string | null
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
              <span className={cn('text-xs font-medium', TONE_TEXT[status.tone])}>{status.text}</span>
              {metric && <span className="ml-auto text-[13px] font-semibold tabular-nums">{metric}</span>}
            </div>
            {day && active.map((s) => <ShiftLine key={s.key} day={day} s={s} thresholds={thresholds} />)}
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
  return (
    <div className="overflow-x-auto p-3">
      <div className="grid min-w-144 grid-cols-7 gap-1.5">
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
                'flex min-h-20 min-w-0 flex-col gap-1 rounded-lg border border-foreground/20 bg-card p-2 text-left transition-colors hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
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
 * Lịch chấm công của tháng. Xem theo tuần (mặc định là tuần có hôm nay, ngày chưa tới hiện mờ) hoặc cả tháng dạng lịch.
 * Đổi tháng thì trang dựng lại component này (`key` theo tháng) để về tuần mặc định.
 */
export function TimesheetCalendar({
  variant,
  month,
  today,
  days,
  thresholds,
}: {
  variant: LedgerVariant
  month: string
  today: string
  /** Các ngày tới hôm nay của tháng. */
  days: LedgerDay[]
  thresholds: readonly number[]
}) {
  /** Tuần thứ Hai – Chủ nhật, cắt theo tháng; chỉ các tuần đã bắt đầu. */
  const weeks = useMemo(() => weeksOfMonth(month).filter((w) => w.days[0] <= today), [month, today])
  const [view, setView] = useState<View>('week')
  const [weekIndex, setWeekIndex] = useState(() => Math.max(0, weeks.findIndex((w) => w.days.includes(today))))
  const [focus, setFocus] = useState<{ date: string; at: number } | null>(null)

  const byDate = useMemo(() => new Map(days.map((d) => [d.date, d])), [days])
  const week = weeks[Math.min(weekIndex, weeks.length - 1)]
  const rows: WeekRow[] = (week?.days ?? []).map((date) => ({ date, day: byDate.get(date) ?? null }))
  const shifts = days[0]?.shifts ?? []

  useEffect(() => {
    if (!focus) return
    const id = requestAnimationFrame(() => {
      const target = [...document.querySelectorAll<HTMLElement>(`[data-day="${focus.date}"]`)].find((el) => el.offsetParent !== null)
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    return () => cancelAnimationFrame(id)
  }, [focus])

  function openDay(date: string) {
    const index = weeks.findIndex((w) => w.days.includes(date))
    if (index >= 0) setWeekIndex(index)
    setView('week')
    setFocus({ date, at: Date.now() })
  }

  function moveWeek(delta: number) {
    setWeekIndex((i) => Math.min(Math.max(i + delta, 0), weeks.length - 1))
    setFocus(null)
  }

  const showWeek = view === 'week' && !!week
  const shown = showWeek ? rows.flatMap((r) => (r.day ? [r.day] : [])) : days
  const label = showWeek ? `Tuần ${week.index + 1}` : formatMonth(month)

  return (
    <section aria-labelledby="timesheet-calendar" className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/20">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-b-foreground/20 px-4 py-3">
        <div className="min-w-0">
          <h3 id="timesheet-calendar" className="text-base font-semibold">
            Lịch chấm công
          </h3>
          <p className="text-[13px] text-muted-foreground tabular-nums">
            {showWeek ? `Tuần ${week.index + 1} · ${rangeLabel(week.days)} · ghi chú nằm ngay dưới giờ chấm` : 'Bấm một ngày để mở tuần của ngày đó'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle value={view} onChange={setView} />
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

      {showWeek ? (
        <>
          <WeekTable
            className="hidden sm:block"
            variant={variant}
            rows={rows}
            shifts={shifts}
            thresholds={thresholds}
            focusDate={focus?.date ?? null}
          />
          <WeekList className="sm:hidden" variant={variant} rows={rows} thresholds={thresholds} focusDate={focus?.date ?? null} />
        </>
      ) : (
        <MonthGrid variant={variant} month={month} today={today} byDate={byDate} onOpen={openDay} />
      )}

      <p className="border-t border-t-foreground/20 bg-muted/30 px-4 py-2.5 text-[13px] tabular-nums">{periodSummary(shown, variant, label)}</p>
    </section>
  )
}
