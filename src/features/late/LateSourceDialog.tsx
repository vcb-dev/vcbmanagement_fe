import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { daysOfMonth } from '@/features/my-timesheet/day-status'
import { formatDate, formatHoursMinutes } from '@/lib/format'
import type { LateReport } from './late.types'

export function LateSourceDialog({ report, onClose }: { report: LateReport; onClose: () => void }) {
  const days = daysOfMonth(report.month)
  const { totalPeople, latePeople, lateCount, lateMinutes } = report.summary
  const rows = [
    ['Dòng nhân sự', `${totalPeople} người`],
    ['Có đi muộn trong tháng', `${latePeople} người`],
    ['Tổng số lần', `${lateCount} lần`],
    ['Tổng thời gian muộn', formatHoursMinutes(lateMinutes)],
    ['Khoảng ngày', `${formatDate(days[0])} – ${formatDate(days[days.length - 1])}`],
  ]
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nguồn dữ liệu đi muộn</DialogTitle>
          <DialogDescription>Lấy từ giờ vào ca sáng và ca chiều trên Bảng chấm công, theo giờ Việt Nam.</DialogDescription>
        </DialogHeader>
        <dl className="divide-y rounded-lg border text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3 px-3 py-2">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
          <li>Mỗi nhân sự có hai dòng Sáng, Chiều. Ô ghi số phút vào muộn của ca đó trong ngày, gạch ngang là không muộn.</li>
          <li>
            Số phút muộn tính theo giờ vào ca của bộ phận tại lúc chấm, người chưa gán bộ phận dùng giờ mặc định. Giờ quản
            lý bổ sung ở Bảng chấm công cũng được tính lại theo giờ ca.
          </li>
          <li>Mỗi ca vào muộn tính là một lần, một ngày có thể có hai lần.</li>
        </ul>
      </DialogContent>
    </Dialog>
  )
}
