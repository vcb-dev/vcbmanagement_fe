import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { MyTimesheet } from '@/features/my-timesheet/my-timesheet.types'
import { DisputeDialog } from './DisputeDialog'
import { SHEET_STATUS_LABEL, type SheetStatus } from './part-time.types'
import { useConfirmSheet } from './use-part-time'

const STATUS_STYLE: Record<SheetStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  confirmed: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  disputed: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
}

export function PartTimeSheetPanel({ data }: { data: MyTimesheet }) {
  const { sheet, live, partTime } = data
  const [disputeOpen, setDisputeOpen] = useState(false)
  const confirm = useConfirmSheet()

  if (!sheet) {
    return (
      <div className="flex items-center justify-between gap-2 p-3 text-sm text-muted-foreground">
        <span>Tạm tính, chưa chốt công</span>
        <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
          Tạm tính
        </Badge>
      </div>
    )
  }

  const isPending = sheet.status === 'pending'
  const isDisputed = sheet.status === 'disputed'
  const isConfirmed = sheet.status === 'confirmed'
  const sheetType = data.profile.employmentType === 'part_time' ? 'part_time' : 'full_time'

  // So khớp số liệu live với số liệu trong bản chốt
  const isOutdated =
    live != null &&
    partTime != null &&
    (live.offlineHours.toFixed(2) !== partTime.offlineHours.toFixed(2) ||
      live.onlineHours.toFixed(2) !== partTime.onlineHours.toFixed(2) ||
      live.lateCount !== data.attendance.lateCount ||
      live.missingPunchCount !== data.attendance.missingPunchCount)

  const handleConfirm = () => {
    if (window.confirm('Bạn xác nhận số liệu công tháng này là chính xác?')) {
      confirm.mutate(sheet.id)
    }
  }

  return (
    <div className="space-y-3 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Trạng thái:</span>
          <Badge variant="secondary" className={cn('font-medium', STATUS_STYLE[sheet.status])}>
            {SHEET_STATUS_LABEL[sheet.status]}
          </Badge>
          {sheet.openFeedbackCount > 0 && (
            <Badge variant="outline" className="text-xs text-rose-600 border-rose-300">
              {sheet.openFeedbackCount} phản hồi mở
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isPending && sheetType === 'part_time' && (
            <Button
              size="sm"
              variant="default"
              onClick={handleConfirm}
              disabled={confirm.isPending}
            >
              {confirm.isPending ? 'Đang xác nhận...' : 'Xác nhận'}
            </Button>
          )}

          {(isPending || isDisputed) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDisputeOpen(true)}
            >
              Báo sai
            </Button>
          )}
        </div>
      </div>

      {isOutdated && (
        <p className="rounded-md bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-300">
          Số liệu đã thay đổi sau khi chốt, chờ quản lý chốt lại
        </p>
      )}

      {isConfirmed && (
        <p className="text-xs text-muted-foreground">
          Bạn đã xác nhận bản chốt công này. Nếu có thay đổi hoặc cần điều chỉnh thêm, vui lòng liên hệ trực tiếp với quản lý.
        </p>
      )}

      <DisputeDialog
        sheetId={sheet.id}
        sheetType={sheetType}
        open={disputeOpen}
        onOpenChange={setDisputeOpen}
      />
    </div>
  )
}
