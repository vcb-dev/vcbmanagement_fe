import { useMemo } from 'react'
import { DEPARTMENT_COL, DepartmentCell, PERSON_COL, PersonCell, SHIFT_COL } from '@/features/attendance-board/AttendanceBoardTable'
import { rangeLabel, type WeekRange } from '@/features/attendance-board/attendance-board.types'
import { formatDuration } from '@/lib/format'
import { LINE_BOTTOM, LINE_RIGHT, PERSON_RIGHT, SOFT_BOTTOM } from '@/lib/table-lines'
import { cn } from '@/lib/utils'
import { LATE_SHIFTS, lateTotal, type LateReportRow, type LateShift } from './late.types'

// Tiêu đề canh giữa hai chiều, chữ đậm; cột không thuộc nhóm gộp hai tầng để nằm giữa chiều cao header.
const HEAD = cn(
  LINE_BOTTOM,
  LINE_RIGHT,
  'bg-muted px-2.5 py-2 text-center align-middle text-sm leading-5 font-semibold whitespace-nowrap text-foreground',
)
const GROUP = cn(
  SOFT_BOTTOM,
  LINE_RIGHT,
  'bg-muted px-2.5 py-2 text-center text-xs leading-4 font-semibold tracking-wider text-foreground uppercase',
)
const SUB = 'block text-[11px] leading-4 font-normal text-muted-foreground'
const CELL = 'px-2.5 py-1.5 text-center tabular-nums whitespace-nowrap'
const LAST = 'border-r-0'

const rowBottom = (shift: LateShift) => (shift === 'morning' ? SOFT_BOTTOM : LINE_BOTTOM)

function Value({ value, format = String }: { value: number; format?: (v: number) => string }) {
  return value === 0 ? (
    <span className="text-muted-foreground/60">–</span>
  ) : (
    <span className="font-semibold text-amber-600 dark:text-amber-400">{format(value)}</span>
  )
}

/** Tổng hợp theo tuần (thứ Hai – Chủ nhật, cắt theo tháng): số lần đi muộn từng tuần của mỗi ca, và tổng cả tháng. */
export function LateWeekSummaryTable({
  rows,
  weeks,
  onSelectPerson,
}: {
  rows: LateReportRow[]
  weeks: WeekRange[]
  onSelectPerson: (row: LateReportRow) => void
}) {
  const computed = useMemo(() => {
    const weekDays = weeks.map((w) => new Set(w.days))
    const totalsOf = (row: LateReportRow, shift: LateShift) => ({
      perWeek: weekDays.map((days) => lateTotal(row.events, days, shift).count),
      month: lateTotal(row.events, undefined, shift),
    })
    return rows.map((row) => ({
      row,
      byShift: { morning: totalsOf(row, 'morning'), afternoon: totalsOf(row, 'afternoon') },
    }))
  }, [rows, weeks])

  return (
    // Chỉ cuộn ngang; cuộn dọc đi theo trang để không có hai thanh cuộn.
    <div className="overflow-x-auto">
      <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th rowSpan={2} scope="col" className={cn(HEAD, PERSON_COL, PERSON_RIGHT, 'sticky left-0 z-20')}>
              Nhân sự
            </th>
            <th rowSpan={2} scope="col" className={cn(HEAD, DEPARTMENT_COL, 'hidden px-2 md:table-cell')}>
              Bộ phận
            </th>
            <th rowSpan={2} scope="col" className={cn(HEAD, SHIFT_COL, 'z-20 px-1')}>
              Buổi
            </th>
            <th colSpan={weeks.length} scope="colgroup" className={GROUP}>
              Số lần đi muộn theo tuần
            </th>
            <th colSpan={2} scope="colgroup" className={cn(GROUP, LAST)}>
              Cả tháng
            </th>
          </tr>
          <tr>
            {weeks.map((w) => (
              <th key={w.index} scope="col" className={cn(HEAD, 'min-w-16')}>
                Tuần {w.index + 1}
                <span className={SUB}>{rangeLabel(w.days)}</span>
              </th>
            ))}
            <th scope="col" className={cn(HEAD, 'min-w-16')}>
              Số lần
            </th>
            <th scope="col" className={cn(HEAD, LAST, 'min-w-18')}>
              Tổng muộn
            </th>
          </tr>
        </thead>
        {computed.map(({ row, byShift }) => (
          <tbody key={row.user.id} className="group/row">
            {LATE_SHIFTS.map((shift, s) => {
              const { perWeek, month } = byShift[shift.key]
              const bottom = rowBottom(shift.key)
              return (
                <tr key={shift.key}>
                  {s === 0 && (
                    <>
                      <PersonCell
                        person={row}
                        rowSpan={2}
                        className={cn(LINE_BOTTOM, PERSON_RIGHT)}
                        onClick={() => onSelectPerson(row)}
                      />
                      <DepartmentCell person={row} rowSpan={2} className={LINE_BOTTOM} />
                    </>
                  )}
                  <th
                    scope="row"
                    className={cn(
                      SHIFT_COL,
                      LINE_RIGHT,
                      bottom,
                      'z-1 bg-card px-1 text-center text-[11px] font-medium text-muted-foreground group-hover/row:bg-muted',
                    )}
                  >
                    {shift.label}
                  </th>
                  {perWeek.map((count, i) => (
                    <td key={i} className={cn(CELL, LINE_RIGHT, bottom)}>
                      <Value value={count} />
                    </td>
                  ))}
                  <td className={cn(CELL, LINE_RIGHT, bottom, 'bg-primary/5')}>
                    <Value value={month.count} />
                  </td>
                  <td className={cn(CELL, bottom)}>
                    <Value value={month.minutes} format={formatDuration} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        ))}
      </table>
    </div>
  )
}
