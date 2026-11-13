import { Sun, Sunset, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AttendancePhotos } from '@/features/attendance/AttendancePhoto'
import type { ShiftRecord } from '@/features/attendance/attendance.types'
import { formatDateTime, formatDuration, formatTime, formatWorkDate } from '@/lib/format'
import { lateLevelLabel, lateLevelTone } from '@/lib/late-levels'
import { displayName } from '@/lib/user-display'
import { cn } from '@/lib/utils'
import { DAY_KIND_LABEL, DAY_KIND_STYLE, dayKind, isShiftMissing, isWholeDayWithoutLunch } from './day-status'
import type { DayRecord, DayShift } from './my-timesheet.types'

/** Giờ chuẩn của ca lúc chấm: giờ vào trừ số phút muộn đã ghi, nên vẫn đúng khi bộ phận đổi giờ sau đó. */
function standardStart(shift: ShiftRecord): string {
  return formatTime(new Date(new Date(shift.inAt!).getTime() - (shift.lateMinutes ?? 0) * 60_000).toISOString())
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

function SessionCard({
  icon: Icon,
  name,
  shift,
  missing,
  thresholds,
}: {
  icon: LucideIcon
  name: string
  shift: DayShift
  missing: boolean
  thresholds: readonly number[]
}) {
  const hasData = !!(shift.inAt || shift.outAt)
  const late = shift.lateMinutes ?? 0
  const early = shift.earlyMinutes ?? 0
  return (
    <section className="rounded-lg bg-muted/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-2 text-sm">
        <span className="flex items-center gap-1.5 font-medium">
          <Icon className="size-4 text-muted-foreground" />
          {name}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {missing ? 'Thiếu mốc' : shift.workedMinutes != null ? formatDuration(shift.workedMinutes) : hasData ? 'Đang ghi nhận' : ''}
        </span>
      </div>
      {hasData ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <TimeBox label="Giờ vào" value={shift.inAt} missing={missing} />
            <TimeBox label="Giờ ra" value={shift.outAt} missing={missing} />
          </div>
          {late > 0 && shift.inAt && (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-amber-700 dark:text-amber-400">
              <span>
                Giờ vào chuẩn {standardStart(shift)}, vào muộn {formatDuration(late)}.
              </span>
              {shift.lateLevel != null && (
                <Badge variant="secondary" className={cn('font-medium', lateLevelTone(shift.lateLevel, thresholds))}>
                  {lateLevelLabel(shift.lateLevel, thresholds)}
                </Badge>
              )}
            </div>
          )}
          {early > 0 && <p className="mt-2 text-xs text-orange-700 dark:text-orange-400">Về sớm {formatDuration(early)}.</p>}
        </>
      ) : (
        <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">Không có ca này trong ngày.</p>
      )}
    </section>
  )
}

export function DayDetailCard({
  ymd,
  record,
  today,
  thresholds,
}: {
  ymd: string
  record: DayRecord | undefined
  today: string
  /** Bộ mốc đi muộn áp dụng cho người dùng, để hiện khoảng phút của mốc. */
  thresholds: readonly number[]
}) {
  const live = ymd === today
  const kind = dayKind(record, live)
  const late = record?.lateMinutes ?? 0
  const punchNotes = record?.punches.map((p) => p.note).filter(Boolean) ?? []
  const notes = [
    kind === 'missing' && 'Có ca chưa đủ giờ vào và giờ ra nên chưa được tính công.',
    record && isWholeDayWithoutLunch(record) && 'Ngày này không chấm công giờ nghỉ trưa, vẫn tính đủ cả ngày.',
    late > 0 && `Tổng đi muộn trong ngày: ${formatDuration(late)}.`,
    record?.workedMinutes != null && `Tổng giờ làm: ${formatDuration(record.workedMinutes)}.`,
    punchNotes.length > 0 && `Ghi chú: ${punchNotes.join(' · ')}`,
  ].filter((note): note is string => !!note)
  const adjustment = record?.adjustment

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chi tiết ngày {ymd.slice(8)}/{ymd.slice(5, 7)}</CardTitle>
        <CardDescription className="capitalize">{formatWorkDate(ymd, { long: true }).split(',')[0]}</CardDescription>
        <CardAction>
          <Badge variant="secondary" className={cn(DAY_KIND_STYLE[kind])}>
            {DAY_KIND_LABEL[kind]}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        {record ? (
          <>
            <SessionCard
              icon={Sun}
              name="Buổi sáng"
              shift={record.morning}
              missing={isShiftMissing(record.morning, record, live)}
              thresholds={thresholds}
            />
            <SessionCard
              icon={Sunset}
              name="Buổi chiều"
              shift={record.afternoon}
              missing={isShiftMissing(record.afternoon, record, live)}
              thresholds={thresholds}
            />
            {adjustment && (
              <div className="space-y-0.5 rounded-lg bg-sky-500/10 p-3 text-xs text-sky-900 dark:text-sky-200">
                <p>
                  Giờ ngày này do <b className="font-medium">{displayName(adjustment.adjustedBy)}</b> bổ sung lúc{' '}
                  <span className="tabular-nums">{formatDateTime(adjustment.adjustedAt)}</span>.
                </p>
                <p className="break-words">“{adjustment.note}”</p>
              </div>
            )}
            {notes.length > 0 && (
              <div className="space-y-1 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                {notes.map((note) => (
                  <p key={note}>{note}</p>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">Ảnh chấm công</span>
              <AttendancePhotos record={record} />
            </div>
          </>
        ) : (
          <p className="rounded-lg border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
            Không có dữ liệu chấm công trong ngày này.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
