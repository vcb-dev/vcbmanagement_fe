import { useMemo } from 'react'
import {
  DEPARTMENT_COL,
  DepartmentCell,
  PERSON_COL,
  PersonCell,
  SHIFT_COL,
  SUNDAY,
  SUNDAY_HEAD,
} from '@/features/attendance-board/AttendanceBoardTable'
import { formatDayMonth, formatDuration, weekdayShort } from '@/lib/format'
import { LINE_BOTTOM, LINE_RIGHT, SOFT_BOTTOM } from '@/lib/table-lines'
import { displayName } from '@/lib/user-display'
import { cn } from '@/lib/utils'
import { LATE_SHIFTS, SHIFT_LABEL, lateByShift, lateTotal, type LateReportRow, type LateShift } from './late.types'

// Tiêu đề canh giữa hai chiều, chữ đậm. Mọi ô header có nền đặc để ô dính trái che được các cột cuộn ngang bên dưới.
const HEAD = cn(
  LINE_BOTTOM,
  LINE_RIGHT,
  'bg-muted px-2 py-1.5 text-center align-middle text-sm leading-5 font-semibold whitespace-nowrap text-foreground',
)
const DAY_COL = 'min-w-12'
const TOTAL_COL = 'min-w-18'

/** Dòng Sáng kẻ nhạt bên dưới để hai dòng của một người liền một khối, dòng Chiều kẻ đậm để tách người. */
const rowBottom = (shift: LateShift) => (shift === 'morning' ? SOFT_BOTTOM : LINE_BOTTOM)

function Total({ value, format = String }: { value: number; format?: (v: number) => string }) {
  return value === 0 ? <span className="text-muted-foreground/60">–</span> : <span className="font-semibold">{format(value)}</span>
}

/** Một ô ngày của một ca: số phút vào muộn, gạch khi không muộn, trống khi chưa tới ngày. */
function LateCell({
  name,
  ymd,
  shift,
  minutes,
  today,
}: {
  name: string
  ymd: string
  shift: LateShift
  minutes: number | undefined
  today: string
}) {
  const className = cn(DAY_COL, 'h-7.5 px-1 text-center text-[13px] tabular-nums', LINE_RIGHT, rowBottom(shift))
  const sunday = weekdayShort(ymd) === 'CN' && SUNDAY
  if (ymd > today) return <td className={cn(className, sunday)} />
  const title = `${name} · ${weekdayShort(ymd)} ${formatDayMonth(ymd)} · ${SHIFT_LABEL[shift]}: ${
    minutes ? `muộn ${formatDuration(minutes)}` : 'không đi muộn'
  }`
  return (
    <td title={title} className={cn(className, sunday, minutes && 'bg-amber-500/10')}>
      {minutes ? (
        <span className="font-semibold text-amber-600 dark:text-amber-400">{formatDuration(minutes)}</span>
      ) : (
        <span className="text-muted-foreground/40">–</span>
      )}
    </td>
  )
}

/**
 * Bảng theo ngày: mỗi nhân sự hai dòng (Sáng, Chiều), mỗi ngày một cột ghi số phút vào muộn,
 * cuối dòng là số lần và tổng thời gian muộn của ca đó trong các ngày đang xem.
 */
export function LateDayTable({
  rows,
  days,
  today,
  onSelectPerson,
}: {
  rows: LateReportRow[]
  days: string[]
  today: string
  onSelectPerson: (row: LateReportRow) => void
}) {
  const computed = useMemo(() => {
    const inRange = new Set(days)
    return rows.map((row) => ({
      row,
      byShift: lateByShift(row.events),
      totals: {
        morning: lateTotal(row.events, inRange, 'morning'),
        afternoon: lateTotal(row.events, inRange, 'afternoon'),
      },
    }))
  }, [rows, days])

  return (
    // Chỉ cuộn ngang; cuộn dọc đi theo trang để không có hai thanh cuộn.
    <div className="overflow-x-auto">
      <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th scope="col" className={cn(HEAD, PERSON_COL, 'sticky left-0 z-2 border-r border-r-border px-2.5')}>
              Nhân sự
            </th>
            <th scope="col" className={cn(HEAD, DEPARTMENT_COL, 'hidden md:table-cell')}>
              Bộ phận
            </th>
            <th scope="col" className={cn(HEAD, SHIFT_COL, 'z-2 px-1')}>
              Buổi
            </th>
            {days.map((ymd) => (
              <th
                key={ymd}
                scope="col"
                className={cn(HEAD, DAY_COL, weekdayShort(ymd) === 'CN' && SUNDAY_HEAD, ymd === today && 'text-primary')}
              >
                {ymd.slice(8)}
                <span className={cn('ml-1 text-[11px] font-normal text-muted-foreground', ymd === today && 'text-primary')}>
                  {weekdayShort(ymd)}
                </span>
              </th>
            ))}
            <th scope="col" className={cn(HEAD, TOTAL_COL)}>
              Số lần
            </th>
            <th scope="col" className={cn(HEAD, TOTAL_COL, 'border-r-0')}>
              Tổng muộn
            </th>
          </tr>
        </thead>
        {computed.map(({ row, byShift, totals }) => {
          const name = displayName(row.user)
          return (
            <tbody key={row.user.id} className="group/row">
              {LATE_SHIFTS.map((shift, s) => (
                <tr key={shift.key}>
                  {s === 0 && (
                    <>
                      <PersonCell person={row} rowSpan={2} className={LINE_BOTTOM} onClick={() => onSelectPerson(row)} />
                      <DepartmentCell person={row} rowSpan={2} className={LINE_BOTTOM} />
                    </>
                  )}
                  <th
                    scope="row"
                    className={cn(
                      SHIFT_COL,
                      LINE_RIGHT,
                      rowBottom(shift.key),
                      'z-1 bg-card px-1 text-center text-[11px] font-medium text-muted-foreground group-hover/row:bg-muted',
                    )}
                  >
                    {shift.label}
                  </th>
                  {days.map((ymd) => (
                    <LateCell
                      key={ymd}
                      name={name}
                      ymd={ymd}
                      shift={shift.key}
                      minutes={byShift[shift.key].get(ymd)}
                      today={today}
                    />
                  ))}
                  <td className={cn(TOTAL_COL, LINE_RIGHT, rowBottom(shift.key), 'px-2 text-center tabular-nums')}>
                    <Total value={totals[shift.key].count} />
                  </td>
                  <td className={cn(TOTAL_COL, rowBottom(shift.key), 'px-2 text-center whitespace-nowrap tabular-nums')}>
                    <Total value={totals[shift.key].minutes} format={formatDuration} />
                  </td>
                </tr>
              ))}
            </tbody>
          )
        })}
      </table>
    </div>
  )
}
