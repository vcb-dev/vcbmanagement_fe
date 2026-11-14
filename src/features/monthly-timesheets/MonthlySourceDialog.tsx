import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const SOURCES = [
  ['Công máy, thiếu in/out, đi muộn', 'Tự động từ chấm công, tính lại mỗi lần tải trang'],
  ['Làm ở nhà, ngày lễ', 'Quản lý nhập trên bảng hoặc trong chi tiết từng người'],
  ['Phép', 'Quản lý nhập, ghi thẳng vào phép tháng của phép năm nên số phép còn lại tự trừ'],
  ['Tăng ca', 'Quản lý nhập theo từng ngày trong chi tiết từng người'],
  ['Tổng công', 'Công máy + làm ở nhà + ngày lễ + phép, do hệ thống tự tính'],
  ['Bộ phận', 'Theo hồ sơ nhân sự hiện tại'],
] as const

export function MonthlySourceDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dữ liệu chốt công tháng</DialogTitle>
          <DialogDescription>Mỗi dòng là bản chốt công của một nhân sự toàn thời gian trong tháng.</DialogDescription>
        </DialogHeader>
        <dl className="divide-y rounded-lg border text-sm">
          {SOURCES.map(([label, value]) => (
            <div key={label} className="grid gap-1 px-3 py-2 sm:grid-cols-[11rem_1fr] sm:gap-3">
              <dt className="font-medium">{label}</dt>
              <dd className="text-muted-foreground">{value}</dd>
            </div>
          ))}
        </dl>
        <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
          <li>Không có bước chốt riêng: bảng luôn theo chấm công mới nhất và tự tải lại mỗi 30 giây.</li>
          <li>
            Ca nào có chấm công (giờ vào hoặc giờ ra) được 0,5 công. Ca chỉ có một mốc vẫn được tính công nhưng ghi là một lần
            thiếu in/out, trừ hôm nay.
          </li>
          <li>Xin phép và tăng ca ghi riêng, không cộng vào tổng công.</li>
        </ul>
      </DialogContent>
    </Dialog>
  )
}
