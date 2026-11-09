import type { EmploymentType } from '@/features/auth/auth.types'
import type { LateLevelCount } from '@/features/my-timesheet/my-timesheet.types'
import { lateLevelName } from '@/lib/late-levels'

/** Một lần đi muộn: mỗi ca đi muộn tính là một lần. */
export interface LateEvent {
  date: string
  shift: 'morning' | 'afternoon'
  minutes: number
  /** Null khi người này chưa có bộ mốc. */
  level: number | null
}

export interface LateReportRow {
  user: { id: string; email: string; fullName: string | null; isActive: boolean }
  department: { id: string; name: string } | null
  employmentType: EmploymentType
  /** Bộ mốc đang áp dụng cho người này, tăng dần. Rỗng = chưa có mốc. */
  thresholds: number[]
  lateCount: number
  lateMinutes: number
  levels: LateLevelCount[]
  events: LateEvent[]
}

export interface LateRules {
  /** Bộ mốc chung áp dụng trong tháng, tăng dần. */
  general: number[]
  customSetCount: number
}

export interface LateReport {
  month: string
  rules: LateRules
  summary: { totalPeople: number; latePeople: number; lateCount: number; lateMinutes: number }
  rows: LateReportRow[]
}

export const SHIFT_LABEL: Record<LateEvent['shift'], string> = {
  morning: 'Ca sáng',
  afternoon: 'Ca chiều',
}

export interface LateColumn {
  key: string
  name: string
  fromMinutes: number
  toMinutes: number | null
}

const columnKey = (l: Pick<LateLevelCount, 'fromMinutes' | 'toMinutes'>) => `${l.fromMinutes}-${l.toMinutes ?? ''}`

/** Cột tổng theo mốc: mỗi khoảng phút một cột, sắp tăng dần. Các dòng dùng bộ mốc khác nhau thì có thêm cột của từng bộ. */
export function lateColumns(rows: LateReportRow[]): LateColumn[] {
  const columns = new Map<string, LateColumn>()
  for (const row of rows) {
    for (const level of row.levels) {
      const key = columnKey(level)
      if (columns.has(key)) continue
      columns.set(key, {
        key,
        name: lateLevelName(level.level, row.thresholds),
        fromMinutes: level.fromMinutes,
        toMinutes: level.toMinutes,
      })
    }
  }
  return [...columns.values()].sort(
    (a, b) => a.fromMinutes - b.fromMinutes || (a.toMinutes ?? Infinity) - (b.toMinutes ?? Infinity),
  )
}

/** Số lần của một người trong cột; không có nghĩa là bộ mốc của người này không có khoảng đó. */
export function levelInColumn(row: LateReportRow, column: LateColumn): LateLevelCount | undefined {
  return row.levels.find((l) => columnKey(l) === column.key)
}
