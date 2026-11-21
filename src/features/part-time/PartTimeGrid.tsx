import { useLayoutEffect, useRef } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatDayMonth, formatHours, formatTime, todayYmd, weekdayShort } from '@/lib/format'
import { initials } from '@/lib/user-display'
import { cn } from '@/lib/utils'
import type { PartTimeGridRow, PartTimeShiftView, WorkShift } from './part-time.types'

const ALL_SHIFTS: readonly WorkShift[] = ['morning', 'afternoon', 'evening']

const SHIFT_ROW_LABEL: Record<WorkShift, string> = {
  morning: 'Sáng',
  afternoon: 'Chiều',
  evening: 'Tối',
}

// Các cột ghim bên trái; offset `left` của cột sau = tổng độ rộng các cột trước.
// Dưới md (không có cột Bộ phận): ghim Nhân sự 128px (không ảnh đại diện, tên xuống dòng, bộ phận thay email)
// + Buổi 40px, cùng cỡ với các bảng chấm công khác, để thấy được vài ngày bên cạnh.
const COL_STAFF = 'sticky left-0 w-32 min-w-32 max-w-32 md:w-[220px] md:min-w-[220px] md:max-w-[220px]'
const COL_DEPT = 'hidden w-[128px] min-w-[128px] max-w-[128px] md:sticky md:left-[220px] md:table-cell'
const COL_SHIFT = 'sticky left-32 w-10 min-w-10 max-w-10 md:left-[348px] md:w-[60px] md:min-w-[60px] md:max-w-[60px]'

type CellKind = 'online' | 'manual' | 'missing' | 'progress' | 'warn' | 'hours' | 'none'

interface CellInfo {
  kind: CellKind
  label: string
  tooltip: string | null
}

const CELL_STYLE: Record<CellKind, string> = {
  online: 'bg-sky-50 font-medium text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  manual: 'font-medium text-foreground',
  missing: '',
  progress: 'whitespace-nowrap text-[11px] text-muted-foreground',
  warn: 'font-medium text-amber-600 dark:text-amber-400',
  hours: 'text-foreground',
  none: 'text-muted-foreground/40',
}

function punchLine(view: PartTimeShiftView): string | null {
  if (!view.inAt && !view.outAt) return null
  return `Vào ${formatTime(view.inAt)} · Ra ${formatTime(view.outAt)}`
}

function editedBy(entry: NonNullable<PartTimeShiftView['entry']>): string {
  return entry.note ? `${entry.recordedBy.name}: ${entry.note}` : entry.recordedBy.name
}

/** Quy đổi trạng thái một ca thành nội dung ô: số giờ, kiểu hiển thị và dòng chú thích khi di chuột. */
function describeCell(view: PartTimeShiftView): CellInfo {
  const hours = formatHours(view.minutes)
  const punches = punchLine(view)

  if (view.entry?.kind === 'online' || view.mode === 'online') {
    const by = view.entry ? ` · ${editedBy(view.entry)}` : ''
    return { kind: 'online', label: hours, tooltip: `Làm online · ${hours} giờ${by}` }
  }

  if (view.entry?.kind === 'manual') {
    const machine = punches ? ` (máy: ${punches})` : ''
    return {
      kind: 'manual',
      label: hours,
      tooltip: `Đã sửa thành ${hours} giờ · ${editedBy(view.entry)}${machine}`,
    }
  }

  if (view.missing) {
    let tooltip = 'Chưa có giờ chấm'
    if (view.inAt) tooltip = `Vào ${formatTime(view.inAt)} · chưa có giờ ra`
    else if (view.outAt) tooltip = `Chưa có giờ vào · ra ${formatTime(view.outAt)}`
    return { kind: 'missing', label: '--', tooltip }
  }

  if (view.inProgress) {
    return {
      kind: 'progress',
      label: 'Đang làm',
      tooltip: view.inAt ? `Vào ${formatTime(view.inAt)}` : null,
    }
  }

  const late = view.lateMinutes ?? 0
  const early = view.earlyMinutes ?? 0
  if (late > 0 || early > 0) {
    const parts: string[] = []
    if (late > 0) {
      const level = view.lateLevel ? ` (mức ${view.lateLevel})` : ''
      parts.push(`Vào ${formatTime(view.inAt)} · muộn ${late} phút${level}`)
    }
    if (early > 0) parts.push(`Ra ${formatTime(view.outAt)} · về sớm ${early} phút`)
    return { kind: 'warn', label: hours, tooltip: parts.join(' · ') }
  }

  if (view.minutes > 0) return { kind: 'hours', label: hours, tooltip: punches }
  return { kind: 'none', label: '•', tooltip: punches }
}

/** Các buổi hiển thị cho một nhân sự: luôn có sáng, chiều; ca tối chỉ khi bộ phận có ca tối. */
function shiftsOf(row: PartTimeGridRow): WorkShift[] {
  const hasEvening = row.days.some((d) => d.shifts.some((s) => s.shift === 'evening'))
  return ALL_SHIFTS.filter((s) => s !== 'evening' || hasEvening)
}

const isSunday = (date: string) => weekdayShort(date) === 'CN'

function ShiftCell({
  row,
  date,
  view,
  today,
  rowBorder,
  onEdit,
}: {
  row: PartTimeGridRow
  date: string
  view: PartTimeShiftView | undefined
  today: string
  rowBorder: string
  onEdit: (row: PartTimeGridRow, date: string, shift: PartTimeShiftView) => void
}) {
  const tdClass = cn('h-8 border-r p-0 text-center', rowBorder, isSunday(date) && 'bg-muted/60')
  const isFuture = date > today

  if (!view || (isFuture && !view.entry && view.minutes === 0)) {
    return <td className={tdClass} />
  }

  const info = describeCell(view)
  const button = (
    <button
      type="button"
      disabled={isFuture}
      onClick={() => onEdit(row, date, view)}
      aria-label={`${row.user.name} ${formatDayMonth(date)} buổi ${SHIFT_ROW_LABEL[view.shift].toLowerCase()}`}
      className={cn(
        'relative flex h-8 w-full items-center justify-center px-1 text-sm tabular-nums transition-colors',
        isFuture ? 'cursor-default' : 'cursor-pointer hover:bg-primary/5',
        CELL_STYLE[info.kind],
      )}
    >
      {info.kind === 'missing' ? (
        <span className="rounded border border-amber-300 bg-amber-50 px-1.5 text-xs leading-5 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          --
        </span>
      ) : (
        info.label
      )}
      {info.kind === 'manual' && (
        <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-sky-500" />
      )}
    </button>
  )

  if (!info.tooltip) return <td className={tdClass}>{button}</td>

  return (
    <td className={tdClass}>
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {info.tooltip}
        </TooltipContent>
      </Tooltip>
    </td>
  )
}

/** Chú thích màu ô, đặt ở góc phải thanh tab. */
export function PartTimeGridLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <b className="font-semibold text-amber-600 dark:text-amber-400">3.5</b>
        vào muộn / về sớm
      </span>
      <span className="flex items-center gap-1.5">
        <span className="rounded border border-amber-300 bg-amber-50 px-1.5 leading-4 text-amber-700 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          --
        </span>
        thiếu giờ vào / ra
      </span>
      <span className="flex items-center gap-1.5">
        <span className="rounded bg-sky-50 px-1.5 font-medium leading-4 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
          4
        </span>
        làm online
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-sky-500" />
        giờ đã sửa
      </span>
      <span className="flex items-center gap-1.5">
        <span className="text-muted-foreground/50">•</span>
        không chấm
      </span>
    </div>
  )
}

interface PartTimeGridProps {
  rows: PartTimeGridRow[]
  dates: string[]
  onEdit: (row: PartTimeGridRow, date: string, shift: PartTimeShiftView) => void
}

export function PartTimeGrid({ rows, dates, onEdit }: PartTimeGridProps) {
  const today = todayYmd()
  const stickyHead = 'sticky top-0 z-20 border-b border-r bg-muted'
  const stickyHeadLeft = 'z-30'
  const scrollRef = useRef<HTMLDivElement>(null)

  // Điện thoại chỉ thấy 3-4 ngày: mở bảng ở hôm nay (cột hôm nay sát mép phải) thay vì ngày đầu kỳ, như bảng Tăng ca.
  useLayoutEffect(() => {
    const box = scrollRef.current
    const cell = box?.querySelector<HTMLElement>('th[data-today]')
    if (!box || !cell || window.innerWidth >= 768) return
    box.scrollLeft = Math.max(0, cell.offsetLeft + cell.offsetWidth - box.clientWidth + 8)
  }, [dates])

  return (
    <TooltipProvider delayDuration={150}>
      <div ref={scrollRef} className="max-h-[70vh] overflow-auto border-t">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-xs font-semibold text-foreground">
              <th className={cn(stickyHead, stickyHeadLeft, COL_STAFF, 'h-11 px-3 text-center')}>
                Nhân sự
              </th>
              <th className={cn(stickyHead, stickyHeadLeft, COL_DEPT, 'px-2 text-center')}>
                Bộ phận
              </th>
              <th className={cn(stickyHead, stickyHeadLeft, COL_SHIFT, 'px-1 text-center')}>
                Buổi
              </th>
              {dates.map((d) => {
                const isToday = d === today
                return (
                  <th
                    key={d}
                    data-today={isToday || undefined}
                    className={cn(
                      stickyHead,
                      'min-w-[52px] px-1 text-center whitespace-nowrap',
                      isToday && 'bg-accent text-primary',
                      !isToday && isSunday(d) && 'text-muted-foreground',
                    )}
                  >
                    <span className="text-sm font-bold">{d.slice(8, 10)}</span>{' '}
                    <span
                      className={cn(
                        'text-[11px] font-normal',
                        isToday ? 'text-primary' : 'text-muted-foreground',
                      )}
                    >
                      {weekdayShort(d)}
                    </span>
                  </th>
                )
              })}
              <th
                className={cn(
                  stickyHead,
                  'z-30 w-20 min-w-20 border-l border-r-0 px-2 text-center whitespace-nowrap md:sticky md:right-0',
                )}
              >
                Tổng giờ
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={dates.length + 4}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  Không có nhân sự nào trong danh sách.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const shifts = row.skipReason ? null : shiftsOf(row)
                const span = shifts?.length ?? 1
                const groupBorder = 'border-b border-b-border'
                const innerBorder = 'border-b border-b-border/50'
                const dayMap = new Map(row.days.map((d) => [d.date, d]))
                const subline = row.user.isActive
                  ? row.user.email
                  : `Ngừng hoạt động · ${row.user.email}`
                const deptName = row.department?.name ?? 'Chưa gán bộ phận'
                const mobileSubline = row.user.isActive ? deptName : `Ngừng hoạt động · ${deptName}`

                const staffCell = (
                  <td
                    rowSpan={span}
                    className={cn(
                      groupBorder,
                      COL_STAFF,
                      'z-10 border-r bg-card px-2 py-1.5 md:px-3',
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar className="hidden size-8 md:flex">
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] font-semibold text-white">
                          {initials({ fullName: row.user.name, email: row.user.email })}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div
                          className="text-[13px] leading-tight font-medium break-words text-foreground md:truncate md:text-sm md:leading-5"
                          title={row.user.name}
                        >
                          {row.user.name}
                        </div>
                        <div className="hidden truncate text-xs text-muted-foreground md:block" title={subline}>
                          {subline}
                        </div>
                        {/* Điện thoại không có cột Bộ phận: hiện bộ phận ngay dưới tên. */}
                        <div className="truncate text-[11px] text-muted-foreground md:hidden" title={mobileSubline}>
                          {mobileSubline}
                        </div>
                      </div>
                    </div>
                  </td>
                )

                const deptCell = (
                  <td
                    rowSpan={span}
                    title={deptName}
                    className={cn(
                      groupBorder,
                      COL_DEPT,
                      'z-10 border-r bg-card px-2 text-center text-xs text-muted-foreground',
                    )}
                  >
                    <div className="truncate">{deptName}</div>
                  </td>
                )

                const totalCell = (
                  <td
                    rowSpan={span}
                    className={cn(
                      groupBorder,
                      'z-10 w-20 min-w-20 border-l bg-card px-2 text-center font-semibold tabular-nums text-foreground md:sticky md:right-0',
                    )}
                  >
                    {String(row.totalHours)}
                  </td>
                )

                const shiftLabelClass = cn(
                  COL_SHIFT,
                  'z-10 border-r bg-card px-1 text-center text-xs font-medium text-muted-foreground',
                )

                if (!shifts) {
                  return (
                    <tr key={row.user.id}>
                      {staffCell}
                      {deptCell}
                      <td className={cn(groupBorder, shiftLabelClass)}>—</td>
                      <td
                        colSpan={dates.length}
                        className={cn(
                          groupBorder,
                          'border-r px-4 py-2 text-left text-xs italic text-muted-foreground',
                        )}
                      >
                        {row.skipReason}
                      </td>
                      {totalCell}
                    </tr>
                  )
                }

                return shifts.map((shift, i) => {
                  const rowBorder = i === shifts.length - 1 ? groupBorder : innerBorder
                  return (
                    <tr key={`${row.user.id}-${shift}`}>
                      {i === 0 && staffCell}
                      {i === 0 && deptCell}
                      <td className={cn(rowBorder, shiftLabelClass)}>{SHIFT_ROW_LABEL[shift]}</td>
                      {dates.map((date) => (
                        <ShiftCell
                          key={date}
                          row={row}
                          date={date}
                          view={dayMap.get(date)?.shifts.find((s) => s.shift === shift)}
                          today={today}
                          rowBorder={rowBorder}
                          onEdit={onEdit}
                        />
                      ))}
                      {i === 0 && totalCell}
                    </tr>
                  )
                })
              })
            )}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  )
}
