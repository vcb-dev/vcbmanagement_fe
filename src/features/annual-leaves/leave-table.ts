import { normalizeSearch } from '@/lib/format'
import type { AnnualLeaveRow } from './annual-leaves.types'

export type LeaveFilter = 'all' | 'low' | 'none' | 'nocontract'
export type LeaveSort = 'added' | 'name' | 'remain' | 'used'

function vnNameKey(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length <= 1) return name
  const last = parts.pop()!
  return `${last} ${parts.join(' ')}`
}

export function filterLeaveRows(
  rows: AnnualLeaveRow[],
  filter: LeaveFilter,
  query: string,
): AnnualLeaveRow[] {
  const q = normalizeSearch(query.trim())

  return rows.filter((row) => {
    if (filter === 'low' && row.remainingDays > 2) {
      return false
    }
    if (filter === 'none' && row.usedDays !== 0) {
      return false
    }
    if (filter === 'nocontract' && row.user.contractStartDate !== null) {
      return false
    }
    if (q) {
      const matchName = normalizeSearch(row.user.name).includes(q)
      const matchDept = row.user.departmentName
        ? normalizeSearch(row.user.departmentName).includes(q)
        : false
      if (!matchName && !matchDept) {
        return false
      }
    }
    return true
  })
}

export function sortLeaveRows(
  rows: AnnualLeaveRow[],
  sort: LeaveSort,
): AnnualLeaveRow[] {
  if (sort === 'added') return [...rows]
  return [...rows].sort((a, b) => {
    if (sort === 'name') {
      return vnNameKey(a.user.name).localeCompare(vnNameKey(b.user.name), 'vi')
    }
    if (sort === 'remain') {
      return a.remainingDays - b.remainingDays
    }
    if (sort === 'used') {
      return b.usedDays - a.usedDays
    }
    return 0
  })
}

export function leaveStats(rows: AnnualLeaveRow[]): {
  people: number
  used: number
  remaining: number
  low: number
} {
  let used = 0
  let remaining = 0
  let low = 0
  for (const r of rows) {
    used += r.usedDays
    remaining += r.remainingDays
    if (r.remainingDays <= 2) {
      low++
    }
  }
  return {
    people: rows.length,
    used,
    remaining,
    low,
  }
}
