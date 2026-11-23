import { AlertTriangle, ChevronRight, Eye, MessageSquare } from 'lucide-react'
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
import { useElementWidth } from '@/hooks/use-element-width'
import { cn } from '@/lib/utils'
import {
  SHEET_STATUS_LABEL,
  type PartTimeSheetRow,
  type SheetStatus,
} from './part-time.types'

const STATUS_STYLE: Record<SheetStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20',
  confirmed: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20',
  disputed: 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border-rose-500/20',
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
          className="flex items-center gap-1 border-sky-500/30 bg-sky-500/10 text-xs font-normal text-sky-800 dark:text-sky-300"
        >
          <MessageSquare className="h-3 w-3" />
          <span>{row.openFeedbackCount} phản hồi</span>
        </Badge>
      )}

      {row.outdated && (
        <Badge
          variant="outline"
          className="flex items-center gap-1 border-amber-500/30 bg-amber-500/10 text-xs font-normal text-amber-800 dark:text-amber-300"
        >
          <AlertTriangle className="h-3 w-3" />
          <span>Lệch sau chốt</span>
        </Badge>
      )}
    </div>
  )
}

const EMPTY_TEXT = 'Không có dữ liệu nhân viên part-time trong tháng này.'

/** Bảng 9 cột cần chừng 740px; khung hẹp hơn thì bảng phải cuộn ngang, nên hiện danh sách mỗi người một dòng. */
const TABLE_MIN_WIDTH = 760

/** Màu số đi muộn và thiếu chấm công; đậm đủ 4,5:1 trên nền thẻ. */
const LATE_TEXT = 'font-medium text-amber-700 dark:text-amber-400'
const MISSING_TEXT = 'font-medium text-rose-700 dark:text-rose-400'

/** Một số nhỏ trong dòng: nhãn mờ rồi số. */
function Metric({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-baseline gap-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('tabular-nums', className)}>{value}</dd>
    </div>
  )
}

/**
 * Danh sách khi khung hẹp, thay cho bảng 9 cột: tên, bộ phận và các số ở giữa, tổng giờ ở cột phải.
 * Bấm vào đâu trên dòng cũng mở sheet xem và sửa công: nút ở tên phủ cả dòng bằng ::after,
 * nên dòng vẫn là nội dung thường (đọc được từng phần) chứ không gói cả khối vào trong một nút.
 */
function PartTimeSheetList({
  rows,
  onSelect,
}: {
  rows: PartTimeSheetRow[]
  onSelect: (userId: string) => void
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-xl bg-card px-4 py-10 text-center text-sm text-muted-foreground ring-1 ring-foreground/10">
        {EMPTY_TEXT}
      </p>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <ul aria-label="Công part-time theo nhân sự" className="divide-y divide-border/70">
        {rows.map((row) => {
          const data = row.sheet ?? row.live
          const totalHours = data ? data.offlineHours + data.onlineHours : null
          return (
            <li
              key={row.user.id}
              className="relative flex items-start gap-3 px-3 py-3 transition-colors hover:bg-muted/40 has-[button:active]:bg-muted/60"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onSelect(row.user.id)}
                      className="text-left font-medium text-foreground outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring/50 focus-visible:after:ring-inset"
                    >
                      {row.user.name}
                      <span className="sr-only">: xem và sửa công</span>
                    </button>
                    {!row.user.isActive && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        Đã nghỉ
                      </Badge>
                    )}
                  </div>
                  {/* Chưa gán bộ phận thì lý do bỏ qua ngay dưới đã nói, không lặp lại. */}
                  {(row.department || !row.skipReason) && (
                    <p className="truncate text-xs text-muted-foreground">{row.department?.name ?? '—'}</p>
                  )}
                  {row.skipReason && (
                    <Badge variant="destructive" className="w-fit text-[10px] font-normal">
                      {row.skipReason}
                    </Badge>
                  )}
                </div>

                <dl className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                  <Metric label="Offline" value={data ? `${num(data.offlineHours)}h` : '—'} />
                  <Metric label="Online" value={data ? `${num(data.onlineHours)}h` : '—'} />
                  <Metric
                    label="Muộn"
                    value={data ? String(data.lateCount) : '—'}
                    className={cn(data && data.lateCount > 0 && LATE_TEXT)}
                  />
                  <Metric
                    label="Thiếu chấm"
                    value={data ? String(data.missingPunchCount) : '—'}
                    className={cn(data && data.missingPunchCount > 0 && MISSING_TEXT)}
                  />
                </dl>

                <StatusBadges row={row} />
              </div>

              <div className="flex shrink-0 items-center gap-1 self-center">
                <div className="text-right">
                  <p className="text-lg leading-6 font-semibold tabular-nums">{totalHours != null ? num(totalHours) : '—'}</p>
                  <p className="text-[11px] leading-4 text-muted-foreground">giờ</p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function PartTimeSheetTable({
  rows,
  onSelect,
}: {
  rows: PartTimeSheetRow[]
  onSelect: (userId: string) => void
}) {
  const [boxRef, boxWidth] = useElementWidth<HTMLDivElement>()
  return (
    <TooltipProvider delayDuration={150}>
      {/* Chọn bảng hay danh sách theo bề rộng khung, không theo màn hình; chỉ dựng một kiểu. */}
      <div ref={boxRef}>
        {boxWidth < TABLE_MIN_WIDTH ? (
          <PartTimeSheetList rows={rows} onSelect={onSelect} />
        ) : (
          <div className="rounded-md border bg-card">
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
                            <span className={cn(data.lateCount > 0 && LATE_TEXT)}>
                              {data.lateCount}
                            </span>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {data != null ? (
                            <span className={cn(data.missingPunchCount > 0 && MISSING_TEXT)}>
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
        )}
      </div>
    </TooltipProvider>
  )
}
