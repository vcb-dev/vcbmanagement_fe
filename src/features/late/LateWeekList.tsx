import { useMemo } from 'react'
import { formatDayMonth, formatDuration, weekdayShort } from '@/lib/format'
import { EMPLOYMENT_LABEL, displayName } from '@/lib/user-display'
import { cn } from '@/lib/utils'
import { SHIFT_LABEL, lateTotal, type LateReportRow } from './late.types'

/**
 * Đi muộn trên điện thoại: mỗi nhân sự một dòng, các lần muộn trong các ngày đang xem là thẻ nhỏ (thứ, ngày, ca, số phút),
 * bên phải là tổng thời gian và số lần. Không phải vuốt ngang như bảng theo ngày. Bấm dòng mở chi tiết cả tháng.
 */
export function LateWeekList({
  rows,
  days,
  onSelectPerson,
}: {
  rows: LateReportRow[]
  days: string[]
  onSelectPerson: (row: LateReportRow) => void
}) {
  const items = useMemo(() => {
    const inRange = new Set(days)
    return rows.map((row) => ({
      row,
      events: row.events.filter((e) => inRange.has(e.date)),
      total: lateTotal(row.events, inRange),
    }))
  }, [rows, days])

  return (
    <ul>
      {items.map(({ row, events, total }) => {
        const name = displayName(row.user)
        return (
          <li key={row.user.id}>
            <button
              type="button"
              onClick={() => onSelectPerson(row)}
              className={cn(
                'flex w-full flex-col gap-1.5 border-b px-3 py-2.5 text-left transition-colors outline-none active:bg-muted',
                'focus-visible:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
              )}
            >
              <span className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-sm leading-tight font-medium break-words">{name}</span>
                  <span className="mt-0.5 block truncate text-xs leading-tight text-muted-foreground">
                    {!row.user.isActive && 'Đã khoá · '}
                    {row.employmentType === 'part_time' && `${EMPLOYMENT_LABEL.part_time} · `}
                    {row.department?.name ?? 'Chưa gán bộ phận'}
                  </span>
                </span>
                {total.count > 0 ? (
                  <span className="shrink-0 text-right tabular-nums">
                    <span className="block text-sm leading-tight font-semibold text-amber-600 dark:text-amber-400">
                      {formatDuration(total.minutes)}
                    </span>
                    <span className="mt-0.5 block text-xs leading-tight text-muted-foreground">{total.count} lần</span>
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-muted-foreground">Không đi muộn</span>
                )}
              </span>
              {events.length > 0 && (
                <span className="flex flex-wrap gap-1">
                  {events.map((e) => (
                    <span
                      key={`${e.date}-${e.shift}`}
                      className={cn(
                        'rounded-md px-1.5 py-0.5 text-[11px] leading-4 tabular-nums',
                        e.minutes > 0
                          ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      {weekdayShort(e.date)} {formatDayMonth(e.date)} · {SHIFT_LABEL[e.shift].replace('Ca ', '')}{' '}
                      <b className="font-semibold">{e.minutes > 0 ? formatDuration(e.minutes) : 'có phép'}</b>
                    </span>
                  ))}
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
