import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatDayMonth, formatHours, formatTime, todayYmd, weekdayShort } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { PartTimeGridRow, PartTimeShiftView, WorkShift } from './part-time.types'

const SHIFTS: readonly WorkShift[] = ['morning', 'afternoon', 'evening']

interface PartTimeGridProps {
  rows: PartTimeGridRow[]
  dates: string[]
  onEdit: (row: PartTimeGridRow, date: string, shift: PartTimeShiftView) => void
}

function GridCell({
  row,
  date,
  shiftView,
  onEdit,
}: {
  row: PartTimeGridRow
  date: string
  shiftView: PartTimeShiftView | undefined
  onEdit: (row: PartTimeGridRow, date: string, shift: PartTimeShiftView) => void
}) {
  if (!shiftView) {
    return (
      <td className="h-10 min-w-[56px] border-b border-r bg-muted/40 p-0 text-center text-xs text-muted-foreground select-none">
        ·
      </td>
    )
  }

  const isFuture = date > todayYmd()
  const canClick = !isFuture

  let label: string
  let style: string
  let tooltipText: string | undefined
  let hasDot = false

  const isOnline = shiftView.entry?.kind === 'online' || shiftView.mode === 'online'
  const isManual = shiftView.entry?.kind === 'manual'
  const late = shiftView.lateMinutes ?? 0
  const early = shiftView.earlyMinutes ?? 0

  if (isOnline) {
    label = `Online · ${formatHours(shiftView.minutes)}`
    style = 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-medium'
    tooltipText = shiftView.entry
      ? `Online · sửa bởi ${shiftView.entry.recordedBy.name}: ${shiftView.entry.note}`
      : 'Online'
  } else if (isManual) {
    label = formatHours(shiftView.minutes)
    style = 'font-medium'
    hasDot = true
    tooltipText = `Sửa bởi ${shiftView.entry?.recordedBy.name}: ${shiftView.entry?.note}`
  } else if (shiftView.missing) {
    label = 'Thiếu'
    style = 'text-rose-600 dark:text-rose-400 font-medium'
    if (shiftView.inAt) {
      tooltipText = `Vào ${formatTime(shiftView.inAt)} · chưa có giờ ra`
    } else if (shiftView.outAt) {
      tooltipText = `Chưa có giờ vào · ra ${formatTime(shiftView.outAt)}`
    } else {
      tooltipText = 'Chưa có giờ chấm'
    }
  } else if (shiftView.inProgress) {
    label = 'Đang làm'
    style = 'text-muted-foreground text-xs'
    tooltipText = shiftView.inAt ? `Vào ${formatTime(shiftView.inAt)}` : undefined
  } else if (late > 0 || early > 0) {
    label = formatHours(shiftView.minutes)
    style = 'text-amber-600 dark:text-amber-400 font-medium'
    const parts: string[] = []
    if (late > 0) {
      parts.push(
        `Vào ${formatTime(shiftView.inAt)} · muộn ${late} phút${
          shiftView.lateLevel ? ` (mức ${shiftView.lateLevel})` : ''
        }`,
      )
    }
    if (early > 0) {
      parts.push(`Ra ${formatTime(shiftView.outAt)} · về sớm ${early} phút`)
    }
    tooltipText = parts.join(' · ')
  } else if (shiftView.minutes > 0) {
    label = formatHours(shiftView.minutes)
    style = 'text-foreground'
    tooltipText = undefined
  } else {
    label = '—'
    style = 'text-muted-foreground/60'
    tooltipText = undefined
  }

  const content = (
    <button
      type="button"
      disabled={!canClick}
      onClick={() => canClick && onEdit(row, date, shiftView)}
      className={cn(
        'relative flex h-full w-full min-w-[56px] items-center justify-center px-1 text-center text-xs tabular-nums transition-colors',
        style,
        canClick ? 'cursor-pointer hover:bg-muted/60' : 'cursor-default',
      )}
    >
      {hasDot && (
        <span
          className="absolute right-1 top-1 size-1.5 rounded-full bg-primary"
          title="Đã sửa số giờ"
        />
      )}
      <span className="truncate">{label}</span>
    </button>
  )

  if (tooltipText) {
    return (
      <td className="h-10 border-b border-r p-0 text-center">
        <Tooltip>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {tooltipText}
          </TooltipContent>
        </Tooltip>
      </td>
    )
  }

  return <td className="h-10 border-b border-r p-0 text-center">{content}</td>
}

export function PartTimeGrid({ rows, dates, onEdit }: PartTimeGridProps) {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="relative overflow-x-auto rounded-lg border bg-card">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-xs font-medium text-muted-foreground">
              <th
                rowSpan={2}
                className="sticky left-0 z-20 w-12 border-r bg-muted/95 px-2 text-center"
              >
                STT
              </th>
              <th
                rowSpan={2}
                className="sticky left-12 z-20 min-w-[170px] border-r bg-muted/95 px-3"
              >
                Họ tên
              </th>
              <th
                rowSpan={2}
                className="sticky left-[218px] z-20 min-w-[120px] border-r bg-muted/95 px-3"
              >
                Bộ phận
              </th>

              {dates.map((d) => (
                <th
                  key={d}
                  colSpan={3}
                  className="border-r px-2 py-1.5 text-center font-medium whitespace-nowrap"
                >
                  {formatDayMonth(d)} · {weekdayShort(d)}
                </th>
              ))}

              <th
                rowSpan={2}
                className="sticky right-0 z-20 min-w-[76px] border-l bg-muted/95 px-3 text-right"
              >
                Tổng giờ
              </th>
            </tr>
            <tr className="border-b bg-muted/40 text-[11px] text-muted-foreground">
              {dates.map((d) => (
                <th key={`${d}-sub`} colSpan={3} className="border-r p-0">
                  <div className="grid grid-cols-3 text-center">
                    <span className="border-r py-1">Sáng</span>
                    <span className="border-r py-1">Chiều</span>
                    <span className="py-1">Tối</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={dates.length * 3 + 4}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  Không có nhân sự nào trong danh sách.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const dayMap = new Map(row.days.map((d) => [d.date, d]))

                return (
                  <tr key={row.user.id} className="hover:bg-muted/20">
                    <td className="sticky left-0 z-10 border-b border-r bg-card px-2 text-center text-xs text-muted-foreground tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="sticky left-12 z-10 min-w-[170px] border-b border-r bg-card px-3 py-2">
                      <div className="font-medium text-foreground">{row.user.name}</div>
                      <div className="text-xs text-muted-foreground">{row.user.email}</div>
                    </td>
                    <td className="sticky left-[218px] z-10 min-w-[120px] border-b border-r bg-card px-3 py-2 text-xs">
                      {row.department?.name ?? '—'}
                    </td>

                    {row.skipReason ? (
                      <td
                        colSpan={dates.length * 3}
                        className="border-b border-r px-4 py-2 text-center text-xs italic text-muted-foreground"
                      >
                        {row.skipReason}
                      </td>
                    ) : (
                      dates.map((date) => {
                        const dayView = dayMap.get(date)
                        const shiftMap = new Map(dayView?.shifts.map((s) => [s.shift, s]))

                        return SHIFTS.map((shift) => (
                          <GridCell
                            key={`${date}-${shift}`}
                            row={row}
                            date={date}
                            shiftView={shiftMap.get(shift)}
                            onEdit={onEdit}
                          />
                        ))
                      })
                    )}

                    <td className="sticky right-0 z-10 min-w-[76px] border-b border-l bg-card px-3 py-2 text-right font-semibold tabular-nums text-foreground">
                      {String(row.totalHours)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </TooltipProvider>
  )
}
