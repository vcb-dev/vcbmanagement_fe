import { CircleCheck } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { formatOvertime } from '@/features/monthly-timesheets/monthly-timesheets.types'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatMonth } from '@/lib/format'
import type { FullTimeSummary, TimesheetConfirmation } from './my-timesheet.types'
import { useConfirmMyTimesheet } from './use-my-timesheet'

const num = (value: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: 2 })

/** Nút xác nhận công tháng ở đầu thẻ; chưa tới lúc xác nhận thì nút bị khoá, lý do nằm ở dòng mô tả. */
export function ConfirmTimesheetButton({
  month,
  confirmation,
  summary,
}: {
  month: string
  confirmation: TimesheetConfirmation
  summary: FullTimeSummary
}) {
  const confirm = useConfirmMyTimesheet()
  const [asking, setAsking] = useState(false)

  function submit() {
    confirm.mutate(
      { month, version: confirmation.version },
      {
        onSuccess: () => {
          setAsking(false)
          toast.success(`Đã xác nhận công ${formatMonth(month).toLowerCase()}`)
        },
        onError: (err) => {
          setAsking(false)
          toast.error(getApiErrorMessage(err))
        },
      },
    )
  }

  return (
    <>
      <Button size="sm" disabled={!confirmation.canConfirm || confirm.isPending} onClick={() => setAsking(true)}>
        <CircleCheck />
        Xác nhận công đúng
      </Button>
      <ConfirmDialog
        open={asking}
        title={`Xác nhận công ${formatMonth(month).toLowerCase()}?`}
        description={`Tổng công ${num(summary.totalWorkdays)} / ${num(summary.standardWorkdays)} công chuẩn, tăng ca ${formatOvertime(summary.overtimeWorkdays)} công, phép ${num(summary.leaveWorkdays)} ngày. Sau khi xác nhận, nếu số liệu thay đổi bạn sẽ cần xác nhận lại.`}
        confirmLabel="Xác nhận"
        variant="default"
        pending={confirm.isPending}
        onConfirm={submit}
        onCancel={() => setAsking(false)}
      />
    </>
  )
}
