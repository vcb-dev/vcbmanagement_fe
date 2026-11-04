import { Badge } from '@/components/ui/badge'
import { formatDuration, formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { AttendanceRecord, ShiftRecord } from './attendance.types'

const STYLES = {
  onTime: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  late: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  early: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  working: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
  absent: 'bg-muted text-muted-foreground',
}

function Pill({ tone, children }: { tone: keyof typeof STYLES; children: React.ReactNode }) {
  return (
    <Badge variant="secondary" className={cn('gap-1.5 font-medium', STYLES[tone])}>
      <span className="size-1.5 rounded-full bg-current" />
      {children}
    </Badge>
  )
}

/** Ca đã chấm vào nhưng chưa chấm ra. */
function isOpen(shift: ShiftRecord) {
  return !!shift.inAt && !shift.outAt
}

/**
 * Nhiều badge cho một bản ghi: đúng giờ / muộn từng ca, về sớm, đang làm.
 * `live` = bản ghi hôm nay, phân biệt "đang làm việc" với "quên chấm ra" của ngày cũ.
 */
export function AttendanceStatus({
  record,
  live = false,
  hideLate = false,
}: {
  record: AttendanceRecord | null
  live?: boolean
  /** Ẩn badge muộn / đúng giờ khi nơi hiển thị đã có dòng phút muộn riêng. */
  hideLate?: boolean
}) {
  if (!record) return <Pill tone="absent">Chưa chấm công</Pill>
  const { morning, afternoon } = record
  const earlyMinutes = (morning.earlyMinutes ?? 0) + (afternoon.earlyMinutes ?? 0)
  const open = isOpen(morning) || isOpen(afternoon)
  // Ngày cũ không chấm trưa (morning vào + afternoon ra) vẫn là một ngày đủ, không tính quên chấm.
  const missingOut = !live && (isOpen(afternoon) || (isOpen(morning) && !afternoon.outAt))

  return (
    <div className="flex flex-wrap gap-1.5">
      {!hideLate && (morning.lateMinutes ?? 0) > 0 && (
        <Pill tone="late">Sáng muộn {formatDuration(morning.lateMinutes)}</Pill>
      )}
      {!hideLate && (afternoon.lateMinutes ?? 0) > 0 && (
        <Pill tone="late">Chiều muộn {formatDuration(afternoon.lateMinutes)}</Pill>
      )}
      {!hideLate && record.lateCount === 0 && <Pill tone="onTime">Đúng giờ</Pill>}
      {earlyMinutes > 0 && <Pill tone="early">Về sớm {formatDuration(earlyMinutes)}</Pill>}
      {live && open && <Pill tone="working">Đang làm việc</Pill>}
      {live && !open && (afternoon.outAt ? <Pill tone="absent">Đã xong ngày</Pill> : <Pill tone="absent">Nghỉ trưa</Pill>)}
      {missingOut && <Pill tone="absent">Thiếu giờ ra</Pill>}
    </div>
  )
}

/** "08:42 – 11:45" + phút muộn / về sớm của một ca, dùng trong bảng. */
export function ShiftTimes({ shift }: { shift: ShiftRecord }) {
  if (!shift.inAt && !shift.outAt) return <span className="text-muted-foreground">—</span>
  return (
    <div className="space-y-0.5">
      <p className="whitespace-nowrap tabular-nums">
        {formatTime(shift.inAt)} – {formatTime(shift.outAt)}
      </p>
      {((shift.lateMinutes ?? 0) > 0 || (shift.earlyMinutes ?? 0) > 0) && (
        <p className="flex gap-2 text-xs whitespace-nowrap">
          {(shift.lateMinutes ?? 0) > 0 && (
            <span className="text-amber-600 dark:text-amber-400">Muộn {formatDuration(shift.lateMinutes)}</span>
          )}
          {(shift.earlyMinutes ?? 0) > 0 && (
            <span className="text-orange-600 dark:text-orange-400">Sớm {formatDuration(shift.earlyMinutes)}</span>
          )}
        </p>
      )}
    </div>
  )
}
