import type { ReactNode } from 'react'
import { Moon, Sun, Sunset, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AttendancePhotos } from '@/features/attendance/AttendancePhoto'
import type { AttendanceRecord } from '@/features/attendance/attendance.types'
import { formatDuration, formatTime, formatWorkDate } from '@/lib/format'
import { lateLevelLabel, lateLevelTone } from '@/lib/late-levels'
import { cn } from '@/lib/utils'
import { PART_TIME_DAY_LABEL, PART_TIME_DAY_STYLE, partTimeDayKind } from './part-time-day-status'
import { SHIFT_LABEL, type PartTimeDayView, type PartTimeShiftView, type WorkShift } from './part-time.types'

const SHIFT_ICONS: Record<WorkShift, LucideIcon> = {
  morning: Sun,
  afternoon: Sunset,
  evening: Moon,
}

function TimeBox({ label, value, missing }: { label: string; value: string | null; missing: boolean }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      {value ? (
        <p className="font-semibold tabular-nums">{formatTime(value)}</p>
      ) : (
        <p className={cn('text-sm', missing ? 'font-medium text-rose-600 dark:text-rose-400' : 'text-muted-foreground')}>
          {missing ? 'Chưa ghi nhận' : '—'}
        </p>
      )}
    </div>
  )
}

function ShiftSection({
  shift,
  thresholds,
  actions,
}: {
  shift: PartTimeShiftView
  thresholds: readonly number[]
  actions?: (shift: PartTimeShiftView) => ReactNode
}) {
  const Icon = SHIFT_ICONS[shift.shift]
  const isNone = shift.mode === 'none'
  const isOnline = shift.mode === 'online'
  const late = shift.lateMinutes ?? 0
  const early = shift.earlyMinutes ?? 0

  return (
    <section className="rounded-lg bg-muted/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-1.5 font-medium">
          <Icon className="size-4 text-muted-foreground" />
          {SHIFT_LABEL[shift.shift]}
          <span className="text-xs text-muted-foreground">
            ({shift.window.start}–{shift.window.end})
          </span>
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground tabular-nums">
            {shift.missing
              ? 'Thiếu mốc'
              : shift.inProgress
                ? 'Đang làm'
                : isOnline
                  ? 'Online'
                  : shift.minutes > 0
                    ? formatDuration(shift.minutes)
                    : ''}
          </span>
          {actions && <div>{actions(shift)}</div>}
        </div>
      </div>

      {isNone ? (
        <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
          Không có ca này trong ngày.
        </p>
      ) : isOnline ? (
        <div className="space-y-2">
          <div className="rounded-lg border bg-card px-3 py-2">
            <p className="text-xs text-muted-foreground">Hình thức làm việc</p>
            <p className="font-semibold text-sky-600 dark:text-sky-400">
              Online ({formatDuration(shift.minutes)})
            </p>
          </div>
          {shift.entry && (
            <p className="text-xs text-muted-foreground">
              Ghi online bởi {shift.entry.recordedBy.name}: {shift.entry.note}
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <TimeBox label="Giờ vào" value={shift.inAt} missing={shift.missing && !shift.inAt} />
            <TimeBox label="Giờ ra" value={shift.outAt} missing={shift.missing && !shift.outAt} />
          </div>

          {late > 0 && shift.inAt && (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-amber-700 dark:text-amber-400">
              <span>
                Giờ vào chuẩn {shift.window.start}, vào muộn {formatDuration(late)}.
              </span>
              {shift.lateLevel != null && (
                <Badge variant="secondary" className={cn('font-medium', lateLevelTone(shift.lateLevel, thresholds))}>
                  {lateLevelLabel(shift.lateLevel, thresholds)}
                </Badge>
              )}
            </div>
          )}

          {early > 0 && (
            <p className="mt-2 text-xs text-orange-700 dark:text-orange-400">
              Về sớm {formatDuration(early)}.
            </p>
          )}

          {shift.entry && (
            <p className="mt-2 text-xs text-muted-foreground">
              Bổ sung bởi {shift.entry.recordedBy.name}: {shift.entry.note}
            </p>
          )}
        </>
      )}
    </section>
  )
}

export function PartTimeDayDetail({
  ymd,
  day,
  thresholds,
  record,
  actions,
}: {
  ymd: string
  day: PartTimeDayView | undefined
  thresholds: readonly number[]
  record?: AttendanceRecord
  actions?: (shift: PartTimeShiftView) => ReactNode
}) {
  const kind = partTimeDayKind(day)
  const shifts = day?.shifts ?? []

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">{formatWorkDate(ymd)}</CardTitle>
            <CardDescription>
              {day
                ? `Tổng: ${formatDuration(day.offlineMinutes + day.onlineMinutes)} (Offline: ${formatDuration(day.offlineMinutes)}, Online: ${formatDuration(day.onlineMinutes)})`
                : 'Chưa có dữ liệu làm việc'}
            </CardDescription>
          </div>
          <Badge variant="secondary" className={cn('font-medium', PART_TIME_DAY_STYLE[kind])}>
            {PART_TIME_DAY_LABEL[kind]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {shifts.length > 0 ? (
          shifts.map((shift) => (
            <ShiftSection
              key={shift.shift}
              shift={shift}
              thresholds={thresholds}
              actions={actions}
            />
          ))
        ) : (
          <p className="rounded-lg border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            Không có dữ liệu ca làm việc trong ngày này.
          </p>
        )}

        {record && <AttendancePhotos record={record} />}
      </CardContent>
    </Card>
  )
}
