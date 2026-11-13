import { CalendarPlus, Lock, Pencil, Trash2 } from 'lucide-react'
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

export function AnnualLeaveTable({
  rows,
  year,
  onEdit,
  onRecord,
  onDelete,
}: AnnualLeaveTableProps) {
  const today = todayYmd()
  const currentYear = Number(today.slice(0, 4))
  const currentMonth = Number(today.slice(5, 7))

  return (
    <TooltipProvider delayDuration={150}>
      <div className="overflow-x-auto rounded-lg border bg-card">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Nhân sự</TableHead>
              <TableHead className="min-w-[150px]">Đã dùng / có đến nay</TableHead>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
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
              const contractStr = row.user.contractStartDate
                ? formatDate(row.user.contractStartDate)
                : null
              const hasLeave = hasLeaveThisYear(row)
              const pct =
                row.accruedDays > 0
                  ? Math.min(100, Math.round((row.usedDays / row.accruedDays) * 100))
                  : 0

              return (
                <TableRow
                  key={row.id}
                  onClick={() => onEdit(row)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5 font-medium">
                        <span>{row.user.name}</span>
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
                      </div>
                      <div className="text-xs">
                        {contractStr ? (
                          <span className="text-muted-foreground">Ký HĐ {contractStr}</span>
                        ) : (
                          <span className="font-medium text-amber-600 dark:text-amber-400">
                            Chưa có ngày ký HĐ
                          </span>
                        )}
                        {row.user.departmentName && (
                          <span className="text-muted-foreground"> · {row.user.departmentName}</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm tabular-nums">
                        {formatDays(row.usedDays)} / {formatDays(row.accruedDays)} ngày
                      </span>
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {hasLeave && (
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          Cả năm {formatDays(row.entitledDays)} ngày
                        </span>
                      )}
                    </div>
                  </TableCell>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                    const days = row.months[m - 1]
                    const isBeforeContract = m < row.startMonth
                    const isCurrent = year === currentYear && m === currentMonth
                    const isLocked = row.lockedMonths.includes(m)

                    let tooltipText = ''
                    if (isBeforeContract) {
                      tooltipText = contractStr
                        ? `Chưa tính phép · ký HĐ ${contractStr}`
                        : 'Chưa ký HĐ, chưa có phép'
                    } else if (days > 0) {
                      tooltipText = `Tháng ${m}/${year} · Nghỉ ${formatDays(days)} ngày`
                    } else {
                      tooltipText = 'Không nghỉ'
                    }

                    return (
                      <TableCell key={m} className="p-1 text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'relative flex h-8 w-10 mx-auto items-center justify-center rounded text-xs tabular-nums',
                                days === 0 && 'text-transparent',
                                days > 0 && days <= 1 && 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 font-medium',
                                days > 1 && days <= 2 && 'bg-emerald-500/30 text-emerald-900 dark:text-emerald-100 font-semibold',
                                days > 2 && 'bg-emerald-500/50 text-emerald-950 dark:text-emerald-50 font-bold',
                                isBeforeContract &&
                                  'bg-[repeating-linear-gradient(135deg,var(--color-muted)_0_4px,transparent_4px_8px)]',
                                isCurrent && 'ring-1 ring-primary font-semibold',
                              )}
                            >
                              {days > 0 ? formatDays(days) : ''}
                              {isLocked && (
                                <Lock className="absolute bottom-0.5 right-0.5 size-2 text-muted-foreground" />
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>{tooltipText}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    )
                  })}
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="font-semibold tabular-nums text-sm">
                        {formatDays(row.remainingDays)}
                      </span>
                      {row.status === 'over' && (
                        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400">
                          {LEAVE_STATUS_LABEL.over}
                        </span>
                      )}
                      {!hasLeave && row.status !== 'over' && (
                        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium bg-muted text-muted-foreground">
                          Chưa có phép
                        </span>
                      )}
                      {hasLeave && row.status === 'zero' && (
                        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          {LEAVE_STATUS_LABEL.zero}
                        </span>
                      )}
                      {hasLeave && row.status === 'low' && (
                        <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          {LEAVE_STATUS_LABEL.low}
                        </span>
                      )}
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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => onEdit(row)}
                          >
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
    </TooltipProvider>
  )
}
