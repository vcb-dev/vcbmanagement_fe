import { CalendarPlus, Lock, Pencil, Trash2 } from 'lucide-react'
import type { ComponentProps } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatDate, todayYmd } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AnnualLeaveRow } from './annual-leaves.types'
import { formatDays, LEAVE_STATUS_LABEL } from './leave-status'
import { hasLeaveThisYear } from './leave-table'

interface AnnualLeaveTableProps {
  rows: AnnualLeaveRow[]
  year: number
  onEdit(row: AnnualLeaveRow): void
  onRecord(row: AnnualLeaveRow): void
  onDelete(row: AnnualLeaveRow): void
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

/** Tháng đang xem trong năm `year`; 0 nếu năm khác năm hiện tại. Dùng để viền ô tháng hiện tại. */
function currentMonthOf(year: number): number {
  const today = todayYmd()
  return Number(today.slice(0, 4)) === year ? Number(today.slice(5, 7)) : 0
}

function contractLabel(row: AnnualLeaveRow): string | null {
  return row.user.contractStartDate ? formatDate(row.user.contractStartDate) : null
}

function usedPercent(row: AnnualLeaveRow): number {
  return row.accruedDays > 0 ? Math.min(100, Math.round((row.usedDays / row.accruedDays) * 100)) : 0
}

/** Ô một tháng: đậm dần theo số ngày nghỉ, sọc chéo trước tháng ký HĐ, viền tháng hiện tại, khoá góc khi tháng đã khoá. */
// Nhận thêm props của div (ref, handler di chuột) vì bảng đặt ô này trong TooltipTrigger asChild.
function MonthBox({
  row,
  month,
  isCurrent,
  className,
  ...props
}: ComponentProps<'div'> & {
  row: AnnualLeaveRow
  month: number
  isCurrent: boolean
}) {
  const days = row.months[month - 1]
  const isBeforeContract = month < row.startMonth
  return (
    <div
      {...props}
      className={cn(
        'relative flex items-center justify-center rounded text-xs tabular-nums',
        days === 0 && 'text-transparent',
        days > 0 && days <= 1 && 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-medium',
        days > 1 && days <= 2 && 'bg-emerald-500/30 text-emerald-900 dark:text-emerald-100 font-semibold',
        days > 2 && 'bg-emerald-500/50 text-emerald-950 dark:text-emerald-50 font-bold',
        isBeforeContract &&
          'bg-[repeating-linear-gradient(135deg,var(--color-muted)_0_4px,transparent_4px_8px)]',
        isCurrent && 'ring-1 ring-primary font-semibold',
        className,
      )}
    >
      {days > 0 ? formatDays(days) : ''}
      {row.lockedMonths.includes(month) && (
        <Lock className="absolute bottom-0.5 right-0.5 size-2 text-muted-foreground" />
      )}
    </div>
  )
}

function monthTooltip(row: AnnualLeaveRow, month: number, year: number): string {
  const days = row.months[month - 1]
  if (month < row.startMonth) {
    const contract = contractLabel(row)
    return contract ? `Chưa tính phép · ký HĐ ${contract}` : 'Chưa ký HĐ, chưa có phép'
  }
  return days > 0 ? `Tháng ${month}/${year} · Nghỉ ${formatDays(days)} ngày` : 'Không nghỉ'
}

const CHIP = 'inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium'

/** Nhãn cạnh số còn lại: nghỉ quá, chưa có phép, hết phép, sắp hết phép. */
function StatusChip({ row }: { row: AnnualLeaveRow }) {
  const hasLeave = hasLeaveThisYear(row)
  if (row.status === 'over') {
    return <span className={cn(CHIP, 'bg-rose-500/10 text-rose-600 dark:text-rose-400')}>{LEAVE_STATUS_LABEL.over}</span>
  }
  if (!hasLeave) return <span className={cn(CHIP, 'bg-muted text-muted-foreground')}>Chưa có phép</span>
  if (row.status === 'zero' || row.status === 'low') {
    return (
      <span className={cn(CHIP, 'bg-amber-500/10 text-amber-600 dark:text-amber-400')}>
        {LEAVE_STATUS_LABEL[row.status]}
      </span>
    )
  }
  return null
}

function NameBadges({ row }: { row: AnnualLeaveRow }) {
  return (
    <>
      {row.user.employmentType === 'part_time' && (
        <Badge variant="secondary" className="text-[10px] px-1 py-0">
          Part-time
        </Badge>
      )}
      {!row.user.isActive && (
        <Badge variant="destructive" className="text-[10px] px-1 py-0">
          Ngừng hoạt động
        </Badge>
      )}
    </>
  )
}

/** Dòng phụ dưới tên: ngày ký HĐ (hoặc cảnh báo chưa có) · bộ phận. */
function ContractLine({ row }: { row: AnnualLeaveRow }) {
  const contract = contractLabel(row)
  return (
    <div className="text-xs">
      {contract ? (
        <span className="text-muted-foreground">Ký HĐ {contract}</span>
      ) : (
        <span className="font-medium text-amber-600 dark:text-amber-400">Chưa có ngày ký HĐ</span>
      )}
      {row.user.departmentName && <span className="text-muted-foreground"> · {row.user.departmentName}</span>}
    </div>
  )
}

function UsageBar({ row, className }: { row: AnnualLeaveRow; className?: string }) {
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-muted', className)}>
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${usedPercent(row)}%` }} />
    </div>
  )
}

export function AnnualLeaveTable(props: AnnualLeaveTableProps) {
  return (
    <TooltipProvider delayDuration={150}>
      {/* Điện thoại: mỗi người một thẻ. Từ md trở lên: bảng 12 tháng. */}
      <AnnualLeaveCards {...props} />
      <div className="hidden md:block">
        <AnnualLeaveGrid {...props} />
      </div>
    </TooltipProvider>
  )
}

function AnnualLeaveGrid({ rows, year, onEdit, onRecord, onDelete }: AnnualLeaveTableProps) {
  const currentMonth = currentMonthOf(year)

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Nhân sự</TableHead>
            <TableHead className="min-w-[150px]">Đã dùng / có đến nay</TableHead>
            {MONTHS.map((m) => (
              <TableHead key={m} className="w-12 text-center text-xs">
                T{m}
              </TableHead>
            ))}
            <TableHead className="min-w-[100px] text-right">Còn lại</TableHead>
            <TableHead className="w-28 text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const hasLeave = hasLeaveThisYear(row)
            return (
              <TableRow key={row.id} onClick={() => onEdit(row)} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1.5 font-medium">
                      <span>{row.user.name}</span>
                      <NameBadges row={row} />
                    </div>
                    <ContractLine row={row} />
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm tabular-nums">
                      {formatDays(row.usedDays)} / {formatDays(row.accruedDays)} ngày
                    </span>
                    <UsageBar row={row} className="w-24" />
                    {hasLeave && (
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        Cả năm {formatDays(row.entitledDays)} ngày
                      </span>
                    )}
                  </div>
                </TableCell>
                {MONTHS.map((m) => (
                  <TableCell key={m} className="p-1 text-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <MonthBox row={row} month={m} isCurrent={m === currentMonth} className="mx-auto h-8 w-10" />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>{monthTooltip(row, m, year)}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="font-semibold tabular-nums text-sm">{formatDays(row.remainingDays)}</span>
                    <StatusChip row={row} />
                  </div>
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {/* span giữ tooltip khi nút bị khoá */}
                        <span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            disabled={!hasLeave}
                            onClick={() => onRecord(row)}
                          >
                            <CalendarPlus className="size-3.5" />
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {hasLeave ? 'Ghi nhận nghỉ phép' : 'Chưa có phép năm, không ghi nghỉ được'}
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7" onClick={() => onEdit(row)}>
                          <Pencil className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Chỉnh sửa phép</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-destructive hover:text-destructive"
                          onClick={() => onDelete(row)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Xóa dòng phép</TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

/**
 * Thẻ phép năm cho điện thoại. Không có tooltip (màn cảm ứng không di chuột được):
 * nhãn T1–T12 nằm ngay trên ô, nút có chữ; bấm vào thẻ mở sheet sửa như bấm dòng trên bảng.
 */
function AnnualLeaveCards({ rows, year, onEdit, onRecord, onDelete }: AnnualLeaveTableProps) {
  const currentMonth = currentMonthOf(year)

  return (
    <ul className="space-y-2 md:hidden">
      {rows.map((row) => {
        const hasLeave = hasLeaveThisYear(row)
        return (
          <li
            key={row.id}
            onClick={() => onEdit(row)}
            className="cursor-pointer space-y-3 rounded-lg border bg-card p-3 active:bg-muted/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-1.5 font-medium">
                  <span>{row.user.name}</span>
                  <NameBadges row={row} />
                </div>
                <ContractLine row={row} />
              </div>
              <div className="flex shrink-0 flex-col items-end gap-0.5">
                <span className="text-[11px] text-muted-foreground">Còn lại</span>
                <span className="text-lg leading-none font-semibold tabular-nums">{formatDays(row.remainingDays)}</span>
                <StatusChip row={row} />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="tabular-nums">
                  Đã dùng {formatDays(row.usedDays)} / {formatDays(row.accruedDays)} ngày
                </span>
                {hasLeave && (
                  <span className="text-muted-foreground tabular-nums">Cả năm {formatDays(row.entitledDays)} ngày</span>
                )}
              </div>
              <UsageBar row={row} />
            </div>

            <div className="grid grid-cols-6 gap-1">
              {MONTHS.map((m) => (
                <div key={m} className="space-y-0.5 text-center">
                  <div
                    className={cn(
                      'text-[10px] text-muted-foreground',
                      m === currentMonth && 'font-semibold text-primary',
                    )}
                  >
                    T{m}
                  </div>
                  {/* Viền mờ cho mọi ô để lưới 6×2 đọc được cả khi tháng không nghỉ (ô trống). */}
                  <MonthBox
                    row={row}
                    month={m}
                    isCurrent={m === currentMonth}
                    className="h-7 w-full border border-border/60"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={!hasLeave}
                onClick={() => onRecord(row)}
              >
                <CalendarPlus />
                Ghi nghỉ
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(row)}>
                <Pencil />
                Sửa
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                aria-label={`Xóa dòng phép của ${row.user.name}`}
                onClick={() => onDelete(row)}
              >
                <Trash2 />
              </Button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
