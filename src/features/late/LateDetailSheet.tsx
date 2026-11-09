import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { formatClockMinutes, formatDayMonth, formatHoursMinutes, formatMonth, weekdayShort } from '@/lib/format'
import { lateLevelName, lateLevelTone } from '@/lib/late-levels'
import { displayName } from '@/lib/user-display'
import { cn } from '@/lib/utils'
import { SHIFT_LABEL, type LateReportRow } from './late.types'

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-base font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground tabular-nums">{hint}</p>}
    </div>
  )
}

export function LateDetailSheet({ month, row, onClose }: { month: string; row: LateReportRow; onClose: () => void }) {
  const { user, department, thresholds, levels, events } = row
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
          <div className="grid grid-cols-2 gap-2">
            {levels.map((l) => (
              <Metric key={l.level} label={lateLevelName(l.level, thresholds)} value={`${l.count} lần`} />
            ))}
            <Metric label="Tổng số lần" value={`${row.lateCount} lần`} hint={formatHoursMinutes(row.lateMinutes)} />
          </div>
          {levels.length === 0 && (
            <p className="text-xs text-muted-foreground">Người này chưa có bộ mốc nên các lần đi muộn chưa được xếp mốc.</p>
          )}

          <section className="space-y-2">
            <h3 className="text-sm font-medium">Lịch sử theo ngày</h3>
            {events.length > 0 ? (
              <ul className="space-y-1.5">
                {events.map((event) => (
                  <li
                    key={`${event.date}-${event.shift}`}
                    className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2"
                  >
                    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {formatDayMonth(event.date)} · {weekdayShort(event.date)} · {SHIFT_LABEL[event.shift]}
                      </span>
                      {event.level != null && (
                        <Badge variant="secondary" className={cn(lateLevelTone(event.level, thresholds))}>
                          {lateLevelName(event.level, thresholds)}
                        </Badge>
                      )}
                    </span>
                    <strong className="font-semibold tabular-nums" title={`${event.minutes} phút`}>
                      {formatClockMinutes(event.minutes)}
                    </strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Không phát sinh đi muộn trong tháng.</p>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}
