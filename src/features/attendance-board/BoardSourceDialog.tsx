import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { AttendanceBoard } from './attendance-board.types'

export function BoardSourceDialog({ board, onClose }: { board: AttendanceBoard; onClose: () => void }) {
  const { people, withData, missingCount, lateCount, adjustedDays } = board.summary
  const rows = [
    ['Dòng nhân sự', `${people} người, gồm toàn thời gian và part-time`],
    ['Có chấm công trong tháng', `${withData} người`],
    ['Thiếu chấm', `${missingCount} lần`],
    ['Đi muộn', `${lateCount} lần`],
    ['Ngày quản lý đã bổ sung', `${adjustedDays} ngày`],
  ]
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nguồn dữ liệu bảng chấm công</DialogTitle>
          <DialogDescription>Lấy từ các lượt chấm công trên ứng dụng (ảnh, vị trí, khuôn mặt), theo giờ Việt Nam.</DialogDescription>
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
          <li>
            Mỗi ngày chấm 4 lượt: mỗi nhân sự có hai dòng Sáng, Chiều, mỗi ngày có hai cột Vào, Ra. Bấm vào ô giờ để xem
            ảnh chấm công và bổ sung giờ.
          </li>
          <li>
            Ca nào có chấm công (giờ vào hoặc giờ ra) được 0,5 công, quên một mốc vẫn được tính công. Cùng cách tính với Chốt
            công tháng.
          </li>
          <li>Ca chỉ có một mốc tính là một lần thiếu chấm, trừ hôm nay. Mỗi ca vào sau giờ ca của bộ phận là một lần đi muộn.</li>
          <li>
            Quản lý bổ sung hoặc sửa giờ cho ngày đã qua, bắt buộc ghi chú. Giờ gốc vẫn được giữ và khôi phục được; không ai
            tự sửa công của chính mình.
          </li>
          <li>Bảng tự tải lại mỗi 30 giây.</li>
        </ul>
      </DialogContent>
    </Dialog>
  )
}
