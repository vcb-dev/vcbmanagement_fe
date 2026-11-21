import { useLayoutEffect, useRef } from 'react'
import { UserAvatar } from '@/components/layout/nav-user'
import { NumberCell } from '@/components/number-cell'
import { formatOvertime } from '@/features/monthly-timesheets/monthly-timesheets.types'
import { daysOfMonth } from '@/features/my-timesheet/day-status'
import { formatDayMonth, weekdayShort } from '@/lib/format'
import { LINE_BOTTOM, LINE_RIGHT, PERSON_RIGHT } from '@/lib/table-lines'
import { displayName } from '@/lib/user-display'
import { cn } from '@/lib/utils'
import { overtimeOn, parseOvertime, type OvertimeRow } from './overtime.types'

// Tiêu đề canh giữa hai chiều, chữ đậm. Mọi ô header có nền đặc để ô Nhân sự dính trái che được các cột cuộn ngang bên dưới.
const HEAD = cn(
  LINE_BOTTOM,
  LINE_RIGHT,
  'bg-muted px-1 py-2 text-center align-middle text-sm leading-5 font-semibold text-foreground',
)
const SUB = 'block text-[11px] leading-4 font-normal text-muted-foreground'
/** Ô Chủ nhật trên header: nền đặc, đậm hơn bg-muted một chút. */
const SUNDAY_HEAD = 'bg-[color-mix(in_oklab,var(--muted),var(--foreground)_5%)]'
const CELL = cn(LINE_BOTTOM, LINE_RIGHT, 'px-1 py-1 text-center')
const SUNDAY = 'bg-muted/50'
/** Cột Nhân sự dính trái; điện thoại hẹp lại 128px để thấy được vài ngày bên cạnh. */
const PERSON_WIDTH = 'w-32 max-w-32 min-w-32 sm:w-56 sm:max-w-56 sm:min-w-56'
const INVALID = 'Nhập số giờ tăng ca, số thập phân, tối đa 3 chữ số sau dấu phẩy, ví dụ 1,5 (1 giờ 30 phút) hoặc 0,25 (15 phút)'

export function OvertimeTable({
  month,
  rows,
  today,
  onSave,
}: {
  month: string
  rows: OvertimeRow[]
  today: string
  onSave: (row: OvertimeRow, date: string, workdays: number) => Promise<unknown>
}) {
  const days = daysOfMonth(month)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Điện thoại chỉ thấy 3-4 ngày: mở bảng ở hôm nay (cột hôm nay sát mép phải, các ngày trước nằm bên trái) thay vì ngày 1.
  useLayoutEffect(() => {
    const box = scrollRef.current
    const cell = box?.querySelector<HTMLElement>('th[data-today]')
    if (!box || !cell || window.innerWidth >= 768) return
    box.scrollLeft = Math.max(0, cell.offsetLeft + cell.offsetWidth - box.clientWidth + 8)
  }, [month])

  return (
    // Chỉ cuộn ngang; cuộn dọc đi theo trang để không có hai thanh cuộn.
    <div ref={scrollRef} className="overflow-x-auto">
      <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th scope="col" className={cn(HEAD, PERSON_RIGHT, PERSON_WIDTH, 'sticky left-0 z-2 px-3')}>
              Nhân sự
            </th>
            <th scope="col" className={cn(HEAD, 'hidden min-w-28 px-3 md:table-cell')}>
              Bộ phận
            </th>
            {days.map((ymd) => (
              <th
                key={ymd}
                scope="col"
                data-today={ymd === today || undefined}
                className={cn(HEAD, 'min-w-16', weekdayShort(ymd) === 'CN' && SUNDAY_HEAD, ymd === today && 'text-primary')}
              >
                {formatDayMonth(ymd)}
                <span className={SUB}>{weekdayShort(ymd)}</span>
              </th>
            ))}
            <th scope="col" className={cn(HEAD, 'min-w-16 border-r-0 px-2 whitespace-nowrap')}>
              Tổng tháng
              <span className={SUB}>giờ</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="group/row">
              <td
                className={cn(
                  LINE_BOTTOM,
                  PERSON_RIGHT,
                  PERSON_WIDTH,
                  'sticky left-0 z-[1] bg-card px-2.5 py-1.5 group-hover/row:bg-muted sm:px-3',
                )}
              >
                <span className="flex items-center gap-2.5">
                  <UserAvatar user={row.user} className="hidden size-8 shrink-0 rounded-lg sm:flex" />
                  <span className="min-w-0">
                    <span className="block text-[13px] leading-tight font-medium break-words sm:truncate sm:text-sm sm:leading-5">
                      {displayName(row.user)}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground sm:text-xs">
                      {!row.user.isActive && 'Đã khoá · '}
                      {/* Màn hẹp không có cột Bộ phận nên hiện bộ phận thay cho email. */}
                      <span className="md:hidden">{row.department?.name ?? 'Chưa gán bộ phận'}</span>
                      <span className="hidden md:inline">{row.user.email}</span>
                    </span>
                  </span>
                </span>
              </td>
              <td
                className={cn(
                  LINE_BOTTOM,
                  LINE_RIGHT,
                  'hidden px-3 py-1.5 text-center text-xs whitespace-nowrap text-muted-foreground md:table-cell',
                )}
              >
                {row.department?.name ?? 'Chưa gán bộ phận'}
              </td>
              {days.map((ymd) => (
                <td key={ymd} className={cn(CELL, weekdayShort(ymd) === 'CN' && SUNDAY)}>
                  <NumberCell
                    value={overtimeOn(row, ymd)}
                    navKey={ymd}
                    blankZero
                    fractionDigits={3}
                    parse={parseOvertime}
                    invalidMessage={INVALID}
                    label={`Số giờ tăng ca ngày ${formatDayMonth(ymd)} của ${displayName(row.user)}`}
                    onSave={(workdays) => onSave(row, ymd, workdays)}
                    className="w-[3.75rem] border-transparent px-1 text-center hover:border-dashed hover:border-primary/40"
                  />
                </td>
              ))}
              <td
                className={cn(
                  CELL,
                  'border-r-0 bg-primary/5 px-2 font-semibold tabular-nums',
                  row.overtimeWorkdays ? 'text-primary' : 'font-normal text-muted-foreground/60',
                )}
              >
                {formatOvertime(row.overtimeWorkdays)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
