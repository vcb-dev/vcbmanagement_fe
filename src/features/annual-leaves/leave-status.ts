import type { LeaveStatus } from './annual-leaves.types'

export function leaveStatus(entitledDays: number, usedDays: number): LeaveStatus {
  const rem = entitledDays - usedDays
  if (rem < 0) return 'over'
  if (rem === 0) return 'zero'
  if (rem <= 2) return 'low'
  if (usedDays === 0) return 'none'
  return 'ok'
}

export const LEAVE_STATUS_LABEL: Record<LeaveStatus, string> = {
  over: 'Vượt phép',
  zero: 'Hết phép',
  low: 'Sắp hết',
  none: 'Chưa nghỉ',
  ok: 'Còn phép',
}

export function formatDays(n: number): string {
  return n.toLocaleString('vi-VN', { maximumFractionDigits: 1 })
}
