import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatDayMonth, formatHoursMinutes, formatMonth, weekdayShort } from '@/lib/format'
import { displayName } from '@/lib/user-display'
import { SHIFT_LABEL, lateTotal, type LateReportRow, type LateTotal } from './late.types'

function Metric({ label, total }: { label: string; total: LateTotal }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-base font-semibold tabular-nums">{total.count} lần</p>
      <p className="text-xs text-muted-foreground tabular-nums">{total.count ? formatHoursMinutes(total.minutes) : '–'}</p>
    </div>
  )
}

/** Các lần đi muộn cả tháng của một người, tách theo ca sáng và ca chiều. */
export function LateDetailSheet({ month, row, onClose }: { month: string; row: LateReportRow; onClose: () => void }) {
  const { user, department, events } = row
  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader className="border-b pr-12">
          <SheetTitle>{displayName(user)}</SheetTitle>
          <SheetDescription>
            {department?.name ?? 'Chưa gán bộ phận'} · Đi muộn {formatMonth(month).toLowerCase()}
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Ca sáng" total={lateTotal(events, undefined, 'morning')} />
            <Metric label="Ca chiều" total={lateTotal(events, undefined, 'afternoon')} />
            <Metric label="Cả tháng" total={lateTotal(events)} />
          </div>

          <section className="space-y-2">
            <h3 className="text-sm font-medium">Lịch sử theo ngày</h3>
            {events.length > 0 ? (
              <ul className="space-y-1.5">
                {events.map((event) => (
                  <li
                    key={`${event.date}-${event.shift}`}
                    className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                  >
                    <span className="text-sm tabular-nums">
                      {weekdayShort(event.date)} {formatDayMonth(event.date)}
                      <span className="text-muted-foreground"> · {SHIFT_LABEL[event.shift]}</span>
                    </span>
                    <strong className="font-semibold text-amber-600 tabular-nums dark:text-amber-400">
                      {formatHoursMinutes(event.minutes)}
                    </strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Không đi muộn lần nào trong tháng.</p>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
