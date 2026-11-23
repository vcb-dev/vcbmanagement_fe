import type { ReactNode } from 'react'
import { formatDuration } from '@/lib/format'
import { displayName } from '@/lib/user-display'
import { cn } from '@/lib/utils'
import { Status } from './MonthlyTimesheetTable'
import { formatOvertime, formatWorkdays, isOverLeave, type FullTimeTimesheetRow } from './monthly-timesheets.types'

const WARN = 'text-amber-700 dark:text-amber-400'

/** Nhãn nhạt, số đậm; `className` tô màu cho số (vd cam khi là điểm cần xem lại). */
function Fact({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <span className="whitespace-nowrap text-muted-foreground">
      {label} <b className={cn('font-semibold text-foreground tabular-nums', className)}>{children}</b>
    </span>
  )
}

/**
 * Chốt công trên điện thoại: mỗi nhân sự một dòng gồm tổng công, trạng thái xác nhận và các số khác 0
 * (thiếu in/out, đi muộn, công quản lý nhập, tăng ca). Bấm dòng mở chi tiết để xem đủ và sửa,
 * thay cho bảng nhiều cột phải vuốt ngang và ô nhập nhỏ.
 */
export function MonthlyTimesheetList({
  rows,
  standardWorkdays,
  onSelect,
}: {
  rows: FullTimeTimesheetRow[]
  standardWorkdays: number
  onSelect: (id: string) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 border-b border-b-foreground/20 bg-muted px-3 py-2 text-sm font-semibold">
        <span>Nhân sự</span>
        <span className="text-right">
          Tổng công <span className="text-xs font-normal text-muted-foreground">/ chuẩn {formatWorkdays(standardWorkdays)}</span>
        </span>
      </div>
      <ul>
        {rows.map((row) => {
          const manual = row.machineWorkdays !== row.totalWorkdays
          return (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => onSelect(row.id)}
                className={cn(
                  'flex w-full flex-col gap-1.5 border-b px-3 py-2.5 text-left transition-colors outline-none active:bg-muted',
                  'focus-visible:bg-primary/5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                )}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-sm leading-tight font-medium break-words">{displayName(row.user)}</span>
                    <span className="mt-0.5 block truncate text-xs leading-tight text-muted-foreground">
                      {!row.user.isActive && 'Đã khoá · '}
                      {row.department?.name ?? 'Chưa gán bộ phận'}
                    </span>
                  </span>
                  <span className="shrink-0 text-base leading-tight font-semibold text-primary tabular-nums">
                    {formatWorkdays(row.totalWorkdays)}
                  </span>
                </span>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <Status row={row} />
                  {manual && <Fact label="Công máy">{formatWorkdays(row.machineWorkdays)}</Fact>}
                  {row.missingPunchCount > 0 && (
                    <Fact label="Thiếu in/out" className={WARN}>
                      {row.missingPunchCount}
                    </Fact>
                  )}
                  {row.lateMinutes > 0 && (
                    <Fact label="Đi muộn" className={WARN}>
                      {formatDuration(row.lateMinutes)}
                    </Fact>
                  )}
                  {row.offsiteWorkdays > 0 && <Fact label="Làm ở nhà">{formatWorkdays(row.offsiteWorkdays)}</Fact>}
                  {row.holidayWorkdays > 0 && <Fact label="Ngày lễ">{formatWorkdays(row.holidayWorkdays)}</Fact>}
                  {row.leaveWorkdays > 0 && (
                    <Fact label="Phép" className={cn(isOverLeave(row) && 'text-destructive')}>
                      {formatWorkdays(row.leaveWorkdays)}
                      {isOverLeave(row) && ' (quá phép)'}
                    </Fact>
                  )}
                  {row.overtimeWorkdays > 0 && <Fact label="Tăng ca">{formatOvertime(row.overtimeWorkdays)} giờ</Fact>}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
