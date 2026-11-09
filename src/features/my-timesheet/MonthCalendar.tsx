import { cn } from '@/lib/utils'
import type { AttendanceRecord } from '@/features/attendance/attendance.types'
import { DAY_KIND_LABEL, DAY_KIND_STYLE, dayKind, daysOfMonth, leadingBlanks, type DayKind } from './day-status'

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const LEGEND: { kind: DayKind; swatch: string }[] = [
  { kind: 'full', swatch: 'bg-emerald-500' },
  { kind: 'morning', swatch: 'bg-sky-500' },
  { kind: 'afternoon', swatch: 'bg-violet-500' },
  { kind: 'missing', swatch: 'bg-rose-500' },
  { kind: 'none', swatch: 'bg-muted-foreground/30' },
]

export function MonthCalendar({
  month,
  records,
  today,
  selected,
  onSelect,
}: {
  month: string
  records: Map<string, AttendanceRecord>
  today: string
  selected: string
  onSelect: (ymd: string) => void
}) {
  return (
    <div>
      <div className="mb-1.5 grid grid-cols-7 gap-1 sm:gap-1.5">
        {WEEKDAYS.map((d) => (
          <span key={d} className="text-center text-xs font-medium text-muted-foreground">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {Array.from({ length: leadingBlanks(month) }).map((_, i) => (
          <span key={i} aria-hidden="true" />
        ))}
        {daysOfMonth(month).map((ymd) => {
          const record = records.get(ymd)
          const kind = dayKind(record, ymd === today)
          const late = record?.lateMinutes ?? 0
          const day = Number(ymd.slice(8))
          const future = ymd > today
          const level = Math.max(record?.morning.lateLevel ?? 0, record?.afternoon.lateLevel ?? 0)
          const description = `${DAY_KIND_LABEL[kind]}${late > 0 ? `, đi muộn ${late} phút` : ''}${level > 0 ? `, mốc ${level}` : ''}`
          return (
            <button
              key={ymd}
              type="button"
              disabled={future}
              aria-pressed={ymd === selected}
              aria-label={`Ngày ${day}: ${future ? 'chưa đến' : description}`}
              title={future ? undefined : description}
              onClick={() => onSelect(ymd)}
              className={cn(
                'flex h-13 min-w-0 flex-col items-center justify-center gap-0.5 rounded-md px-0.5 transition-colors sm:h-16',
                DAY_KIND_STYLE[future ? 'none' : kind],
                !future && 'hover:ring-1 hover:ring-primary/50',
                future && 'cursor-default opacity-50',
                late > 0 && 'ring-1 ring-amber-500 ring-inset',
                ymd === selected && 'ring-2 ring-primary ring-inset',
              )}
            >
              <span className={cn('text-sm font-semibold tabular-nums', ymd === today && 'underline underline-offset-2')}>
                {day}
              </span>
              {!future && kind !== 'none' && (
                <span className="hidden max-w-full truncate text-[11px] leading-tight font-medium sm:block">
                  {DAY_KIND_LABEL[kind]}
                </span>
              )}
              {late > 0 && (
                <span className="max-w-full truncate text-[10px] leading-tight font-semibold text-amber-700 tabular-nums dark:text-amber-400">
                  {late}′
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {LEGEND.map(({ kind, swatch }) => (
          <span key={kind} className="flex items-center gap-1.5">
            <i className={cn('size-2.5 rounded-sm', swatch)} />
            {DAY_KIND_LABEL[kind]}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <i className="size-2.5 rounded-sm ring-1 ring-amber-500 ring-inset" />
          Có đi muộn
        </span>
      </div>
    </div>
  )
}
