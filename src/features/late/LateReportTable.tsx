import { UserAvatar } from '@/components/layout/nav-user'
import { daysOfMonth } from '@/features/my-timesheet/day-status'
import { formatClockMinutes, formatDayMonth, weekdayShort } from '@/lib/format'
import { lateLevelRange, lateLevelText, lateLevelTone } from '@/lib/late-levels'
import { displayName } from '@/lib/user-display'
import { cn } from '@/lib/utils'
import { SHIFT_LABEL, levelInColumn, type LateColumn, type LateEvent, type LateReportRow } from './late.types'

const HEAD = 'sticky top-0 z-10 border-r border-b bg-muted px-1 py-1.5 text-xs font-medium text-muted-foreground'
const CELL = 'border-r border-b px-1 py-1.5 text-center tabular-nums'
const SUNDAY = 'bg-muted/50'

function LateChip({ event, thresholds }: { event: LateEvent; thresholds: readonly number[] }) {
  const level = event.level != null ? ` (mốc ${lateLevelRange(event.level, thresholds)})` : ''
  return (
    <span
      title={`${SHIFT_LABEL[event.shift]}: muộn ${event.minutes} phút${level}`}
      className={cn(
        'inline-flex h-6 min-w-11 items-center justify-center rounded-md px-1.5 text-xs font-semibold',
        event.level != null ? lateLevelTone(event.level, thresholds) : 'bg-muted text-foreground',
      )}
    >
      {formatClockMinutes(event.minutes)}
    </span>
  )
}

export function LateReportTable({
  month,
  rows,
  columns,
  today,
  onSelect,
}: {
  month: string
  rows: LateReportRow[]
  /** Cột tổng theo mốc, tính trên toàn bộ dòng đang lọc để không đổi khi chuyển trang. */
  columns: LateColumn[]
  today: string
  onSelect: (userId: string) => void
}) {
  const days = daysOfMonth(month)

  return (
    <div className="max-h-[max(22rem,calc(100svh-17rem))] overflow-auto">
      <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th scope="col" className={cn(HEAD, 'left-0 z-20 max-w-44 min-w-44 px-3 text-left sm:max-w-56 sm:min-w-56')}>
              Nhân sự
            </th>
            <th scope="col" className={cn(HEAD, 'hidden min-w-32 px-3 text-left md:table-cell')}>
              Bộ phận
            </th>
            {days.map((ymd) => (
              <th key={ymd} scope="col" className={cn(HEAD, 'min-w-14 text-center font-semibold text-foreground')}>
                {formatDayMonth(ymd)}
                <span className="block text-[10px] font-normal text-muted-foreground">{weekdayShort(ymd)}</span>
              </th>
            ))}
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(HEAD, 'min-w-20 px-2 text-center font-semibold whitespace-nowrap text-foreground')}
              >
                {column.name}
              </th>
            ))}
            <th scope="col" className={cn(HEAD, 'min-w-16 text-center font-semibold text-foreground')}>
              Tổng lần
            </th>
            <th scope="col" className={cn(HEAD, 'min-w-16 border-r-0 text-center font-semibold text-foreground')}>
              Tổng phút
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.user.id}>
              <td className="sticky left-0 z-[1] max-w-44 min-w-44 border-r border-b bg-card px-3 py-1.5 sm:max-w-56 sm:min-w-56">
                <button
                  type="button"
                  onClick={() => onSelect(row.user.id)}
                  className="group/name flex w-full items-center gap-2.5 text-left"
                >
                  <UserAvatar user={row.user} className="size-8 shrink-0 rounded-lg" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium group-hover/name:underline">{displayName(row.user)}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {!row.user.isActive && 'Đã khoá · '}
                      {row.user.email}
                    </span>
                  </span>
                </button>
              </td>
              <td className="hidden border-r border-b px-3 py-1.5 text-xs whitespace-nowrap text-muted-foreground md:table-cell">
                {row.department?.name ?? 'Chưa gán bộ phận'}
              </td>
              {days.map((ymd) => {
                const events = row.events.filter((e) => e.date === ymd)
                return (
                  <td key={ymd} className={cn(CELL, weekdayShort(ymd) === 'CN' && SUNDAY)}>
                    {events.length > 0 ? (
                      <span className="flex flex-col items-center gap-0.5">
                        {events.map((event) => (
                          <LateChip key={event.shift} event={event} thresholds={row.thresholds} />
                        ))}
                      </span>
                    ) : (
                      ymd <= today && <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>
                )
              })}
              {columns.map((column) => {
                const level = levelInColumn(row, column)
                return (
                  <td
                    key={column.key}
                    className={cn(
                      CELL,
                      'font-semibold',
                      !level?.count
                        ? 'font-normal text-muted-foreground/60'
                        : level.level > 1 && lateLevelText(level.level, row.thresholds),
                    )}
                  >
                    {level?.count ?? '—'}
                  </td>
                )
              })}
              <td className={cn(CELL, 'bg-primary/5 font-semibold text-primary')}>{row.lateCount}</td>
              <td className={cn(CELL, 'border-r-0', row.lateMinutes ? 'font-semibold' : 'text-muted-foreground/60')}>
                {row.lateMinutes}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
