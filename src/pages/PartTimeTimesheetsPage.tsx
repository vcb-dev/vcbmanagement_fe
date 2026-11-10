import { useState } from 'react'
import { MonthNav } from '@/components/month-nav'
import { PageContainer } from '@/components/page-container'
import { PageHeader } from '@/components/page-header'
import { Skeleton } from '@/components/ui/skeleton'
import { getApiErrorMessage } from '@/lib/api-client'
import { todayYmd } from '@/lib/format'
import { CloseMonthButton } from '@/features/part-time/CloseMonthButton'
import { PartTimeSheetTable } from '@/features/part-time/PartTimeSheetTable'
import { usePartTimeSheets } from '@/features/part-time/use-part-time-admin'

export function PartTimeTimesheetsPage() {
  const currentMonth = todayYmd().slice(0, 7)
  const [month, setMonth] = useState(currentMonth)
  const [_selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const { data: rows = [], isPending, isError, error, refetch } = usePartTimeSheets(month)

  return (
    <PageContainer>
      <PageHeader
        title="Công part-time"
        description="Quản lý và chốt công nhân sự bán thời gian."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <MonthNav month={month} max={currentMonth} onChange={setMonth} />
            <CloseMonthButton month={month} />
          </div>
        }
      />

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
        <PartTimeSheetTable rows={rows} onSelect={setSelectedUserId} />
      )}
    </PageContainer>
  )
}
