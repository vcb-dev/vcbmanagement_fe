import type { AnnualLeaveRow } from './annual-leaves.types'

/** Có tháng nào được tính phép trong năm không. Chưa ký HĐ (hoặc ký sau năm) thì chưa có phép. */
export function hasLeaveThisYear(row: Pick<AnnualLeaveRow, 'startMonth'>): boolean {
  return row.startMonth <= 12
}
