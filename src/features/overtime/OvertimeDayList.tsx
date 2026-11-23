import { NumberCell } from '@/components/number-cell'
import { formatOvertime } from '@/features/monthly-timesheets/monthly-timesheets.types'
import { formatDayMonth, weekdayShort } from '@/lib/format'
import { LINE_BOTTOM } from '@/lib/table-lines'
import { displayName } from '@/lib/user-display'
import { cn } from '@/lib/utils'
import { overtimeOn, parseOvertime, type OvertimeRow } from './overtime.types'

const HEAD = cn(LINE_BOTTOM, 'bg-muted px-2 py-1.5 text-center align-middle text-sm leading-5 font-semibold text-foreground')
const SUB = 'block text-[11px] leading-4 font-normal text-muted-foreground'
const INVALID = 'Nhập số giờ tăng ca, số thập phân, tối đa 3 chữ số sau dấu phẩy, ví dụ 1,5 (1 giờ 30 phút) hoặc 0,25 (15 phút)'

/**
 * Tăng ca trên điện thoại: một ngày (chọn ở dải ngày), mỗi nhân sự một dòng với ô nhập số giờ của ngày đó và tổng tháng.
 * Vẫn là bảng để Enter trên bàn phím số chuyển xuống ô của người kế tiếp.
 */
export function OvertimeDayList({
  rows,
  date,
  onSave,
}: {
  rows: OvertimeRow[]
  date: string
  onSave: (row: OvertimeRow, date: string, workdays: number) => Promise<unknown>
}) {
  return (
    <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
      <thead>
        <tr>
          <th scope="col" className={cn(HEAD, 'px-3 text-left')}>
            Nhân sự
          </th>
          <th scope="col" className={cn(HEAD, 'w-24 border-l')}>
            {weekdayShort(date)} {formatDayMonth(date)}
            <span className={SUB}>giờ</span>
          </th>
          <th scope="col" className={cn(HEAD, 'w-18 border-l')}>
            Tháng
            <span className={SUB}>giờ</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id}>
            <td className="border-b px-3 py-2">
              <span className="block text-[13px] leading-tight font-medium break-words">{displayName(row.user)}</span>
              <span className="mt-0.5 block truncate text-[11px] leading-tight text-muted-foreground">
                {!row.user.isActive && 'Đã khoá · '}
                {row.department?.name ?? 'Chưa gán bộ phận'}
              </span>
            </td>
            <td className="border-b border-l px-2 py-1.5 text-center">
              {/* Màn cảm ứng không có rê chuột nên ô luôn có viền để biết chỗ bấm nhập; chữ 16px để iPhone không tự phóng to khi bấm vào. */}
              <NumberCell
                value={overtimeOn(row, date)}
                navKey="overtime-day"
                blankZero
                fractionDigits={3}
                parse={parseOvertime}
                invalidMessage={INVALID}
                label={`Số giờ tăng ca ngày ${formatDayMonth(date)} của ${displayName(row.user)}`}
                onSave={(workdays) => onSave(row, date, workdays)}
                className="h-9 w-full border-input text-center text-base dark:bg-input/30"
              />
            </td>
            <td
              className={cn(
                'border-b border-l px-2 py-1.5 text-center tabular-nums',
                row.overtimeWorkdays ? 'font-semibold text-primary' : 'text-muted-foreground/60',
              )}
            >
              {row.overtimeWorkdays ? formatOvertime(row.overtimeWorkdays) : '–'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
