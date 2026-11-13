import { CircleCheck, PencilLine } from 'lucide-react'
import { UserAvatar } from '@/components/layout/nav-user'
import { Badge } from '@/components/ui/badge'
import { formatDateTime, formatDayMonth } from '@/lib/format'
import { LINE_BOTTOM, LINE_RIGHT, PERSON_RIGHT, SOFT_BOTTOM } from '@/lib/table-lines'
import { displayName } from '@/lib/user-display'
import { cn } from '@/lib/utils'
import { NumberCell } from '@/components/number-cell'
import {
  MANUAL_FIELDS,
  STATUS_LABEL,
  STATUS_TONE,
  formatOvertime,
  formatWorkdays,
  isOverLeave,
  leaveBalanceText,
  leaveLockReason,
  manualValue,
  parseWorkdays,
  type FullTimeTimesheetRow,
  type ManualField,
} from './monthly-timesheets.types'

const INVALID: Record<'leave' | 'other', string> = {
  leave: 'Công phép tính theo 0,5 ngày, từ 0 đến 31',
  other: 'Nhập số từ 0 đến 31, tối đa 2 chữ số thập phân, ví dụ 1 hoặc 1,5',
}

// Header phải có nền đặc: ô Nhân sự dính trái, nền trong suốt sẽ để lộ các cột đang cuộn ngang bên dưới.
// Mọi tiêu đề canh giữa theo cả hai chiều; cột không thuộc nhóm gộp hai tầng để nằm giữa chiều cao header.
// Mỗi ô kẻ đậm bên phải, riêng cột cuối bỏ kẻ vì đã sát mép thẻ.
const GROUP = cn(
  SOFT_BOTTOM,
  LINE_RIGHT,
  'bg-muted px-2.5 py-2 text-xs leading-4 font-semibold tracking-wider text-foreground uppercase',
)
/** Khối flex để nhãn có biểu tượng và nhãn chữ thường đứng cùng độ cao. */
const GROUP_LABEL = 'flex items-center justify-center gap-1.5'
const HEAD = cn(
  LINE_BOTTOM,
  LINE_RIGHT,
  'bg-muted px-3 py-2.5 text-center align-middle text-sm leading-5 font-semibold whitespace-nowrap text-foreground',
)
const MANUAL_HEAD = 'bg-accent'
const SUB = 'block text-[11px] leading-4 font-normal text-muted-foreground'
const CELL = cn(LINE_BOTTOM, LINE_RIGHT, 'px-2.5 py-1.5 text-center tabular-nums whitespace-nowrap')
const MANUAL_BG = 'bg-primary/[0.03]'
const LAST = 'border-r-0'
/** Tạm ẩn cột Xin phép trên bảng; vẫn sửa được trong chi tiết từng người. */
const TABLE_MANUAL_FIELDS = MANUAL_FIELDS.filter((f) => f.field !== 'excusedWorkdays')
/** Ô sửa được chỉ hiện khung khi rê chuột vào dòng, để bảng không kín ô viền. */
const REVEAL_ON_ROW = 'group-hover/row:border-border group-hover/row:bg-background dark:group-hover/row:bg-input/30'

/** ISO → "08/11" theo giờ Việt Nam. */
const confirmedDay = (iso: string) =>
  formatDayMonth(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(iso)))

function Count({ value, warn }: { value: number; warn?: boolean }) {
  return (
    <span className={cn(value === 0 ? 'text-muted-foreground/50' : warn && 'font-semibold text-amber-600 dark:text-amber-400')}>
      {formatWorkdays(value)}
    </span>
  )
}

/** Chờ xác nhận là trạng thái thường gặp nên hiện nhẹ; chỉ báo sai công mới cần nổi bật. */
function Status({ row }: { row: FullTimeTimesheetRow }) {
  if (row.confirmationStatus === 'confirmed') {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400"
        title={row.confirmedAt ? `Nhân viên xác nhận lúc ${formatDateTime(row.confirmedAt)}` : undefined}
      >
        <CircleCheck className="size-3.5" />
        {STATUS_LABEL.confirmed}
        {row.confirmedAt && <span className="font-normal text-muted-foreground tabular-nums">{confirmedDay(row.confirmedAt)}</span>}
      </span>
    )
  }
  if (row.confirmationStatus === 'disputed') {
    return (
      <Badge variant="secondary" className={STATUS_TONE.disputed}>
        {STATUS_LABEL.disputed}
      </Badge>
    )
  }
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <span className="size-1.5 rounded-full bg-amber-500" aria-hidden />
      {STATUS_LABEL.pending}
    </span>
  )
}

export function MonthlyTimesheetTable({
  rows,
  standardWorkdays,
  onSelect,
  onSave,
}: {
  rows: FullTimeTimesheetRow[]
  /** Số công chuẩn của tháng, hiện cạnh tổng công để so. */
  standardWorkdays: number
  /** `overtime` = mở chi tiết ở phần tăng ca. */
  onSelect: (id: string, focus?: 'overtime') => void
  onSave: (row: FullTimeTimesheetRow, field: ManualField, value: number) => Promise<unknown>
}) {
  return (
    // Chỉ cuộn ngang; cuộn dọc đi theo trang để không có hai thanh cuộn.
    <div className="overflow-x-auto">
      <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th
              rowSpan={2}
              scope="col"
              className={cn(HEAD, PERSON_RIGHT, 'sticky left-0 z-2 max-w-44 min-w-44 sm:max-w-56 sm:min-w-56')}
            >
              Nhân sự
            </th>
            <th rowSpan={2} scope="col" className={cn(HEAD, 'hidden min-w-28 md:table-cell')}>
              Bộ phận
            </th>
            <th colSpan={3} scope="colgroup" className={GROUP} title="Tính lại từ chấm công mỗi lần tải">
              <span className={GROUP_LABEL}>Tự động</span>
            </th>
            <th colSpan={TABLE_MANUAL_FIELDS.length + 1} scope="colgroup" className={cn(GROUP, MANUAL_HEAD)} title="Quản lý nhập, bấm vào ô để sửa">
              <span className={GROUP_LABEL}>
                <PencilLine className="size-3.5 text-primary" />
                Quản lý nhập
              </span>
            </th>
            <th
              rowSpan={2}
              scope="col"
              className={HEAD}
              title="Công máy + làm ở nhà + ngày lễ + phép. Tăng ca không cộng vào"
            >
              Tổng công
              <span className={SUB}>chuẩn {formatWorkdays(standardWorkdays)}</span>
            </th>
            <th rowSpan={2} scope="col" className={cn(HEAD, LAST, 'min-w-36')}>
              Xác nhận
            </th>
          </tr>
          <tr>
            <th scope="col" className={HEAD} title="Mỗi ca đủ giờ vào và giờ ra được 0,5 công">
              Công máy
            </th>
            <th scope="col" className={HEAD} title="Số ca chỉ có giờ vào hoặc chỉ có giờ ra">
              Thiếu in/out
              <span className={SUB}>số lần</span>
            </th>
            <th scope="col" className={HEAD} title="Số ca vào muộn trong tháng">
              Đi muộn
              <span className={SUB}>số lần</span>
            </th>
            {TABLE_MANUAL_FIELDS.map((f) => (
              <th
                key={f.field}
                scope="col"
                className={cn(HEAD, MANUAL_HEAD)}
                title={`${f.label} · ${f.hint}`}
              >
                {f.short}
              </th>
            ))}
            <th scope="col" className={cn(HEAD, MANUAL_HEAD)} title="Nhập theo từng ngày, không cộng vào tổng công">
              Tăng ca
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="group/row hover:bg-muted">
              <td
                className={cn(
                  LINE_BOTTOM,
                  PERSON_RIGHT,
                  'sticky left-0 z-[1] max-w-44 min-w-44 bg-card px-3 py-1.5 group-hover/row:bg-muted sm:max-w-56 sm:min-w-56',
                )}
              >
                <button type="button" onClick={() => onSelect(row.id)} className="group/name flex w-full items-center gap-2.5 text-left">
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
              <td className={cn(CELL, 'hidden text-xs text-muted-foreground md:table-cell')}>
                {row.department?.name ?? 'Chưa gán bộ phận'}
              </td>
              <td className={CELL}>
                <Count value={row.machineWorkdays} />
              </td>
              <td className={CELL}>
                <Count value={row.missingPunchCount} warn />
              </td>
              <td className={CELL}>
                <Count value={row.lateCount} warn />
              </td>
              {TABLE_MANUAL_FIELDS.map((f) => {
                const isLeave = f.field === 'leaveDays'
                const disabledHint = isLeave ? leaveLockReason(row) : undefined
                // Ô đang mở thì rê chuột thấy phép năm còn lại (title của ô cha, vì ô nhập không có title riêng).
                const leaveTitle = isLeave && row.leave && !disabledHint ? leaveBalanceText(row.leave) : undefined
                return (
                  <td key={f.field} title={leaveTitle} className={cn(CELL, MANUAL_BG, 'px-1.5')}>
                    <NumberCell
                      value={manualValue(row, f.field)}
                      navKey={f.field}
                      blankZero
                      parse={(raw) => parseWorkdays(raw, f.field)}
                      invalidMessage={INVALID[f.field === 'leaveDays' ? 'leave' : 'other']}
                      label={`${f.short} của ${displayName(row.user)}`}
                      disabledHint={disabledHint}
                      onSave={(value) => onSave(row, f.field, value)}
                      className={cn(
                        'text-center',
                        !disabledHint && REVEAL_ON_ROW,
                        isLeave && isOverLeave(row) && 'font-semibold text-destructive',
                      )}
                    />
                  </td>
                )
              })}
              <td className={cn(CELL, MANUAL_BG, 'px-1.5')}>
                <button
                  type="button"
                  onClick={() => onSelect(row.id, 'overtime')}
                  title="Sửa tăng ca theo ngày"
                  aria-label={`Tăng ca của ${displayName(row.user)}: ${formatOvertime(row.overtimeWorkdays)} công, bấm để sửa theo ngày`}
                  className={cn(
                    'h-8 w-14 rounded-md border border-transparent px-2 text-center transition-colors outline-none',
                    'hover:border-input hover:bg-background dark:hover:bg-input/30',
                    'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30',
                    REVEAL_ON_ROW,
                  )}
                >
                  {row.overtimeWorkdays > 0 && formatOvertime(row.overtimeWorkdays)}
                </button>
              </td>
              <td className={cn(CELL, 'px-3.5 font-semibold text-primary')}>{formatWorkdays(row.totalWorkdays)}</td>
              <td className={cn(CELL, LAST)}>
                <Status row={row} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
