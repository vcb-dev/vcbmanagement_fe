import { MonthNav } from '@/components/month-nav'
import { Skeleton } from '@/components/ui/skeleton'
import { getApiErrorMessage } from '@/lib/api-client'
import { todayYmd } from '@/lib/format'
import { CloseMonthButton } from './CloseMonthButton'
import { PartTimeSheetTable } from './PartTimeSheetTable'
import { PartTimeUserSheet } from './PartTimeUserSheet'
import { usePartTimeSheets } from './use-part-time-admin'

export function PartTimeClosingTab({
  month,
  onMonthChange,
  selectedUserId,
  onSelectUser,
}: {
  month: string
  onMonthChange: (m: string) => void
  selectedUserId: string | null
  onSelectUser: (id: string | null) => void
}) {
  const currentMonth = todayYmd().slice(0, 7)
  const { data: rows = [], isPending, isError, error, refetch } = usePartTimeSheets(month)

  const selectedRow = rows.find((r) => r.user.id === selectedUserId) ?? null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          Chốt số giờ làm việc, giải quyết khiếu nại và xem lịch sử chấm công từng nhân sự.
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthNav month={month} max={currentMonth} onChange={onMonthChange} />
          <CloseMonthButton month={month} />
        </div>
      </div>

      {isError ? (
        <p className="py-8 text-center text-sm text-destructive">
          {getApiErrorMessage(error)}{' '}
          <button type="button" className="underline" onClick={() => void refetch()}>
            Thử lại
          </button>
        </p>
      ) : isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <PartTimeSheetTable rows={rows} onSelect={onSelectUser} />
      )}

      <PartTimeUserSheet
        row={selectedRow}
        month={month}
        onClose={() => onSelectUser(null)}
      />
    </div>
  )
}
