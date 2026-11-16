import type { PartTimeDayView } from './part-time.types'

export type PartTimeDayKind = 'worked' | 'online' | 'missing' | 'none'

export function partTimeDayKind(day: PartTimeDayView | undefined): PartTimeDayKind {
  if (!day || !day.shifts || day.shifts.length === 0) return 'none'
  const activeShifts = day.shifts.filter((s) => s.mode !== 'none')
  if (activeShifts.length === 0) return 'none'
  if (day.shifts.some((s) => s.missing)) return 'missing'
  if (activeShifts.every((s) => s.mode === 'online')) return 'online'
  return 'worked'
}

export const PART_TIME_DAY_LABEL: Record<PartTimeDayKind, string> = {
  worked: 'Có làm',
  online: 'Online',
  missing: 'Thiếu mốc',
  none: 'Không có ca',
}

export const PART_TIME_DAY_STYLE: Record<PartTimeDayKind, string> = {
  worked: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  online: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
  missing: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
  none: 'bg-muted/40 text-muted-foreground',
}
