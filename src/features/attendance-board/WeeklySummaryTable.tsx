import { useMemo } from 'react'
import { formatWorkdays } from '@/features/monthly-timesheets/monthly-timesheets.types'
import { LINE_BOTTOM, LINE_RIGHT, PERSON_RIGHT, SOFT_BOTTOM } from '@/lib/table-lines'
import { cn } from '@/lib/utils'
import { DEPARTMENT_COL, DepartmentCell, PERSON_COL, PersonCell } from './AttendanceBoardTable'
import { dayIndex, rangeLabel, totalsOf, type BoardRow, type WeekRange } from './attendance-board.types'

// Tiêu đề canh giữa hai chiều, chữ đậm; cột không thuộc nhóm gộp hai tầng để nằm giữa chiều cao header.
// Mỗi ô kẻ đậm bên phải, riêng cột cuối bỏ kẻ vì đã sát mép thẻ.
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
const CELL = cn(LINE_BOTTOM, LINE_RIGHT, 'px-2.5 py-1.5 text-center tabular-nums whitespace-nowrap')
const LAST = 'border-r-0'

function Value({ value, warn, format = String }: { value: number; warn?: boolean; format?: (v: number) => string }) {
  return value === 0 ? (
    <span className="text-muted-foreground/60">–</span>
  ) : (
    <span className={cn(warn && 'font-semibold text-amber-600 dark:text-amber-400')}>{format(value)}</span>
  )
}

/** Tổng hợp theo tuần (thứ Hai – Chủ nhật, cắt theo tháng): công máy và số lần thiếu chấm của từng tuần. */
export function WeeklySummaryTable({
  rows,
  weeks,
  onSelectPerson,
}: {
  rows: BoardRow[]
  weeks: WeekRange[]
  onSelectPerson: (row: BoardRow) => void
}) {
  const computed = useMemo(
    () =>
      rows.map((row) => {
        const byDate = dayIndex(row)
        const perWeek = weeks.map((w) => totalsOf(w.days.map((d) => byDate.get(d))))
        return { row, perWeek, month: totalsOf(row.days) }
      }),
    [rows, weeks],
  )

  const weekHead = (w: WeekRange) => (
    <th key={w.index} scope="col" className={cn(HEAD, 'min-w-16')}>
      Tuần {w.index + 1}
      <span className={SUB}>{rangeLabel(w.days)}</span>
    </th>
  )

  return (
    // Chỉ cuộn ngang; cuộn dọc đi theo trang để không có hai thanh cuộn.
    <div className="overflow-x-auto">
      <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th
              rowSpan={2}
              scope="col"
              className={cn(HEAD, PERSON_COL, PERSON_RIGHT, 'sticky left-0 z-2')}
            >
              Nhân sự
            </th>
            <th rowSpan={2} scope="col" className={cn(HEAD, DEPARTMENT_COL, 'hidden px-2 md:table-cell')}>
              Bộ phận
            </th>
            <th colSpan={weeks.length + 1} scope="colgroup" className={GROUP} title="Ca nào có chấm công (giờ vào hoặc giờ ra) được 0,5 công; quên một mốc vẫn được tính công">
              Công theo tuần
            </th>
            <th colSpan={weeks.length + 1} scope="colgroup" className={cn(GROUP, LAST)} title="Số ca chỉ có giờ vào hoặc chỉ có giờ ra">
              Thiếu chấm theo tuần
            </th>
          </tr>
          <tr>
            {weeks.map(weekHead)}
            <th scope="col" className={cn(HEAD, 'min-w-16')}>
              Tổng
            </th>
            {weeks.map(weekHead)}
            <th scope="col" className={cn(HEAD, LAST, 'min-w-16')}>
              Tổng
            </th>
          </tr>
        </thead>
        <tbody>
          {computed.map(({ row, perWeek, month }) => (
            <tr key={row.user.id} className="group/row">
              <PersonCell person={row} className={cn(LINE_BOTTOM, PERSON_RIGHT)} onClick={() => onSelectPerson(row)} />
              <DepartmentCell person={row} className={cn(LINE_BOTTOM, LINE_RIGHT)} />
              {perWeek.map((t, i) => (
                <td key={i} className={CELL}>
                  <Value value={t.workdays} format={formatWorkdays} />
                </td>
              ))}
              <td className={cn(CELL, 'bg-primary/5 font-semibold text-primary')}>
                <Value value={month.workdays} format={formatWorkdays} />
              </td>
              {perWeek.map((t, i) => (
                <td key={i} className={CELL}>
                  <Value value={t.missingCount} warn />
                </td>
              ))}
              <td className={cn(CELL, LAST)}>
                <Value value={month.missingCount} warn />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
