import { cn } from '@/lib/utils'
import { DAY_KIND_LABEL, DAY_KIND_STYLE, dayKind, daysOfMonth, leadingBlanks } from './day-status'
import type { DayRecord } from './my-timesheet.types'

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const DEFAULT_LEGEND: { label: string; swatch: string }[] = [
  { label: DAY_KIND_LABEL.full, swatch: 'bg-emerald-500' },
  { label: DAY_KIND_LABEL.morning, swatch: 'bg-sky-500' },
  { label: DAY_KIND_LABEL.afternoon, swatch: 'bg-violet-500' },
  { label: DAY_KIND_LABEL.missing, swatch: 'bg-rose-500' },
  { label: DAY_KIND_LABEL.none, swatch: 'bg-muted-foreground/30' },
]

export function MonthCalendar({
  month,
  records,
  today,
  selected,
  onSelect,
  kind,
  legend,
}: {
  month: string
  records: Map<string, DayRecord>
  today: string
  selected: string
  onSelect: (ymd: string) => void
  kind?: (ymd: string) => { label: string; className: string }
  legend?: { label: string; swatch: string }[]
}) {
  const activeLegend = legend ?? DEFAULT_LEGEND

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
          const late = record?.lateMinutes ?? 0
          const day = Number(ymd.slice(8))
          const future = ymd > today
          const level = Math.max(record?.morning.lateLevel ?? 0, record?.afternoon.lateLevel ?? 0)

          let dayLabel = ''
          let dayStyle = ''

          if (kind) {
            const custom = kind(ymd)
            dayLabel = custom.label
            dayStyle = future ? 'bg-muted/40 text-muted-foreground' : custom.className
          } else {
            const k = dayKind(record, ymd === today)
            dayLabel = DAY_KIND_LABEL[k]
            dayStyle = DAY_KIND_STYLE[future ? 'none' : k]
          }

          const description = `${dayLabel}${late > 0 ? `, đi muộn ${late} phút` : ''}${level > 0 ? `, mốc ${level}` : ''}`

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
                dayStyle,
                !future && 'hover:ring-1 hover:ring-primary/50',
                future && 'cursor-default opacity-50',
                late > 0 && 'ring-1 ring-amber-500 ring-inset',
                ymd === selected && 'ring-2 ring-primary ring-inset',
              )}
            >
              <span className={cn('text-sm font-semibold tabular-nums', ymd === today && 'underline underline-offset-2')}>
                {day}
              </span>
              {!future && dayLabel && dayLabel !== 'Không có ca' && (
                <span className="hidden max-w-full truncate text-[11px] leading-tight font-medium sm:block">
                  {dayLabel}
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
        {activeLegend.map(({ label, swatch }) => (
          <span key={label} className="flex items-center gap-1.5">
            <i className={cn('size-2.5 rounded-sm', swatch)} />
            {label}
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
