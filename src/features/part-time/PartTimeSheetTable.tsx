import { AlertTriangle, Eye, MessageSquare } from 'lucide-react'
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  SHEET_STATUS_LABEL,
  type PartTimeSheetRow,
  type SheetStatus,
} from './part-time.types'

const STATUS_STYLE: Record<SheetStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  confirmed: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  disputed: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
}

function num(val: number): string {
  return val.toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

/** Nhãn trạng thái bản chốt, số phản hồi đang mở và cảnh báo lệch sau chốt. */
function StatusBadges({ row }: { row: PartTimeSheetRow }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {row.sheet ? (
        <Badge
          variant="outline"
          className={cn('text-xs font-normal', STATUS_STYLE[row.sheet.status])}
        >
          {SHEET_STATUS_LABEL[row.sheet.status]}
        </Badge>
      ) : (
        <Badge variant="secondary" className="text-xs font-normal">
          Tạm tính
        </Badge>
      )}

      {row.openFeedbackCount > 0 && (
        <Badge
          variant="outline"
          className="flex items-center gap-1 border-sky-500/30 bg-sky-500/10 text-xs font-normal text-sky-700 dark:text-sky-400"
        >
          <MessageSquare className="h-3 w-3" />
          <span>{row.openFeedbackCount} phản hồi</span>
        </Badge>
      )}

      {row.outdated && (
        <Badge
          variant="outline"
          className="flex items-center gap-1 border-amber-500/30 bg-amber-500/10 text-xs font-normal text-amber-700 dark:text-amber-400"
        >
          <AlertTriangle className="h-3 w-3" />
          <span>Lệch sau chốt</span>
        </Badge>
      )}
    </div>
  )
}

const EMPTY_TEXT = 'Không có dữ liệu nhân viên part-time trong tháng này.'

/** Một ô số trong thẻ điện thoại: nhãn nhỏ phía trên, số phía dưới; `—` khi chưa có số liệu. */
function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className={cn('text-sm tabular-nums', className)}>{value}</dd>
    </div>
  )
}

/** Danh sách thẻ cho điện thoại, thay cho bảng 9 cột. Bấm thẻ mở sheet xem và sửa công như bấm dòng. */
function PartTimeSheetCards({
  rows,
  onSelect,
}: {
  rows: PartTimeSheetRow[]
  onSelect: (userId: string) => void
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-md border bg-card px-4 py-10 text-center text-sm text-muted-foreground md:hidden">
        {EMPTY_TEXT}
      </p>
    )
  }

  return (
    <ul className="space-y-2 md:hidden">
      {rows.map((row) => {
        const data = row.sheet ?? row.live
        const totalHours = data ? data.offlineHours + data.onlineHours : null
        return (
          <li key={row.user.id}>
            <button
              type="button"
              onClick={() => onSelect(row.user.id)}
              aria-label={`Xem và sửa công của ${row.user.name}`}
              className="w-full space-y-2.5 rounded-lg border bg-card p-3 text-left transition-colors active:bg-muted/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{row.user.name}</span>
                    {!row.user.isActive && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        Đã nghỉ
                      </Badge>
                    )}
                  </div>
                  {/* Chưa gán bộ phận thì lý do bỏ qua ngay dưới đã nói, không lặp lại. */}
                  {(row.department || !row.skipReason) && (
                    <div className="truncate text-xs text-muted-foreground">{row.department?.name ?? '—'}</div>
                  )}
                  {row.skipReason && (
                    <Badge variant="destructive" className="w-fit text-[10px] font-normal">
                      {row.skipReason}
                    </Badge>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end">
                  <span className="text-[11px] text-muted-foreground">Tổng</span>
                  <span className="text-lg leading-tight font-semibold tabular-nums">
                    {totalHours != null ? `${num(totalHours)}h` : '—'}
                  </span>
                </div>
              </div>

              <dl className="grid grid-cols-4 gap-2 rounded-md bg-muted/50 px-3 py-2">
                <Stat label="Offline" value={data ? `${num(data.offlineHours)}h` : '—'} />
                <Stat label="Online" value={data ? `${num(data.onlineHours)}h` : '—'} />
                <Stat
                  label="Muộn"
                  value={data ? String(data.lateCount) : '—'}
                  className={cn(data && data.lateCount > 0 && 'font-medium text-amber-600')}
                />
                <Stat
                  label="Thiếu"
                  value={data ? String(data.missingPunchCount) : '—'}
                  className={cn(data && data.missingPunchCount > 0 && 'font-medium text-rose-600')}
                />
              </dl>

              <StatusBadges row={row} />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function PartTimeSheetTable({
  rows,
  onSelect,
}: {
  rows: PartTimeSheetRow[]
  onSelect: (userId: string) => void
}) {
  return (
    <TooltipProvider delayDuration={150}>
      <PartTimeSheetCards rows={rows} onSelect={onSelect} />
      <div className="hidden rounded-md border bg-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nhân viên</TableHead>
              <TableHead>Bộ phận</TableHead>
              <TableHead className="text-right">Offline</TableHead>
              <TableHead className="text-right">Online</TableHead>
              <TableHead className="text-right">Tổng</TableHead>
              <TableHead className="text-right">Muộn</TableHead>
              <TableHead className="text-right">Thiếu</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="w-12">
                <span className="sr-only">Xem và sửa</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                  {EMPTY_TEXT}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => {
                const data = row.sheet ?? row.live
                const totalHours = data ? data.offlineHours + data.onlineHours : null

                return (
                  <TableRow
                    key={row.user.id}
                    onClick={() => onSelect(row.user.id)}
                    className="group cursor-pointer transition-colors hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{row.user.name}</span>
                          {!row.user.isActive && (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Đã nghỉ
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{row.user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span>{row.department?.name ?? '—'}</span>
                        {row.skipReason && (
                          <Badge
                            variant="destructive"
                            className="w-fit text-[10px] font-normal"
                          >
                            {row.skipReason}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {data != null ? `${num(data.offlineHours)}h` : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {data != null ? `${num(data.onlineHours)}h` : '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {totalHours != null ? `${num(totalHours)}h` : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {data != null ? (
                        <span className={data.lateCount > 0 ? 'text-amber-600 font-medium' : ''}>
                          {data.lateCount}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {data != null ? (
                        <span className={data.missingPunchCount > 0 ? 'text-rose-600 font-medium' : ''}>
                          {data.missingPunchCount}
                        </span>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadges row={row} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Xem và sửa công của ${row.user.name}`}
                            className="text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelect(row.user.id)
                            }}
                          >
                            <Eye />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs">
                          Xem và sửa công
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  )
}
