import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { daysOfMonth } from '@/features/my-timesheet/day-status'
import { formatDate } from '@/lib/format'
import type { LateReport } from './late.types'

export function LateSourceDialog({ report, onClose }: { report: LateReport; onClose: () => void }) {
  const days = daysOfMonth(report.month)
  const rows = [
    ['Dòng nhân sự', `${report.summary.totalPeople} người`],
    ['Có phát sinh', `${report.summary.latePeople} người`],
    ['Tổng số lần', `${report.summary.lateCount} lần`],
    ['Khoảng ngày', `${formatDate(days[0])} – ${formatDate(days[days.length - 1])}`],
  ]
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nguồn dữ liệu đi muộn</DialogTitle>
          <DialogDescription>Lấy từ các lượt chấm công vào ca trong hệ thống.</DialogDescription>
        </DialogHeader>
        <dl className="divide-y rounded-lg border text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3 px-3 py-2">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
          <li>Số phút muộn tính theo giờ vào ca của bộ phận tại lúc chấm, người chưa gán bộ phận dùng giờ mặc định.</li>
          <li>Mỗi ca đi muộn tính là một lần, một ngày có thể có hai lần.</li>
          <li>Mốc xếp theo bộ mốc áp dụng trong tháng đó của từng người. Đổi mốc chỉ có hiệu lực từ tháng đổi, các tháng trước giữ nguyên.</li>
        </ul>
      </DialogContent>
    </Dialog>
  )
}
