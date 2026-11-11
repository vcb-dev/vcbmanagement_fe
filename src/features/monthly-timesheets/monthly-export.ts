import { downloadCsv, toCsv } from '@/lib/csv'
import { displayName } from '@/lib/user-display'
import { STATUS_LABEL, type FullTimeTimesheetRow } from './monthly-timesheets.types'

/** Số giữ dấu chấm thập phân để Excel nào cũng đọc được là số. */
export function buildMonthlyCsv(rows: FullTimeTimesheetRow[]): string {
  const header = [
    'Họ tên',
    'Email',
    'Bộ phận',
    'Công máy',
    'Thiếu chấm (lần)',
    'Đi muộn (lần)',
    'Từ xa',
    'Lễ + bù',
    'Xin phép',
    'Phép',
    'Tăng ca',
    'Tổng công',
    'Xác nhận',
  ]
  const lines = rows.map((r) => [
    displayName(r.user),
    r.user.email,
    r.department?.name ?? 'Chưa gán bộ phận',
    r.machineWorkdays,
    r.missingPunchCount,
    r.lateCount,
    r.offsiteWorkdays,
    r.holidayWorkdays,
    r.excusedWorkdays,
    r.leaveWorkdays,
    r.overtimeWorkdays,
    r.totalWorkdays,
    STATUS_LABEL[r.confirmationStatus],
  ])
  return toCsv([header, ...lines])
}

export function downloadMonthlyCsv(month: string, rows: FullTimeTimesheetRow[]) {
  downloadCsv(`chot-cong-${month}.csv`, buildMonthlyCsv(rows))
}
