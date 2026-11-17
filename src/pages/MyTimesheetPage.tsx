import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageContainer } from '@/components/page-container'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useMe } from '@/features/auth/use-auth'
import { fullTimeLedger, ledgerDates, partTimeLedger } from '@/features/my-timesheet/day-ledger'
import { TimesheetCalendar } from '@/features/my-timesheet/TimesheetCalendar'
import { StatsStrip, StatusBanner, TimesheetHeader } from '@/features/my-timesheet/TimesheetOverview'
import { useMyTimesheet } from '@/features/my-timesheet/use-my-timesheet'
import { useMyPartTimeDays } from '@/features/part-time/use-part-time'
import { getApiErrorMessage } from '@/lib/api-client'
import { todayYmd } from '@/lib/format'
import { displayName } from '@/lib/user-display'

/**
 * Công của tôi: đầu trang có tháng và nút Feedback, dải trạng thái xác nhận công, dải số liệu tháng,
 * rồi lịch chấm công theo tuần (hoặc cả tháng) với lời ghi chú nằm ngay dưới từng giờ chấm.
 */
export function MyTimesheetPage() {
  const [searchParams] = useSearchParams()
  const { data: user } = useMe()
  const today = todayYmd()
  const currentMonth = today.slice(0, 7)
  const initialMonth = searchParams.get('month')
  const [month, setMonth] = useState(() =>
    initialMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(initialMonth) && initialMonth <= currentMonth ? initialMonth : currentMonth,
  )

  const sheet = useMyTimesheet(month)
  const data = sheet.data?.month === month ? sheet.data : null

  const isPartTime = sheet.data?.profile.employmentType === 'part_time'
  const ptDays = useMyPartTimeDays(month, Boolean(isPartTime && sheet.data?.profile.department))

  const records = useMemo(() => new Map((data?.records ?? []).map((r) => [r.workDate, r])), [data])
  const ptDaysMap = useMemo(() => new Map((ptDays.data ?? []).map((d) => [d.date, d])), [ptDays.data])

  const days = useMemo(() => {
    if (!data) return []
    const dates = ledgerDates(month, today)
    return isPartTime
      ? partTimeLedger(dates, ptDaysMap, records, data.schedule, today)
      : fullTimeLedger(dates, records, data.fullTime?.overtimeDays ?? [], data.schedule, today)
  }, [data, isPartTime, month, today, ptDaysMap, records])

  if (!user) return null

  const daysReady = data && (!isPartTime || !data.profile.department || ptDays.data)

  return (
    <PageContainer>
      <TimesheetHeader month={month} maxMonth={currentMonth} onMonthChange={setMonth} data={sheet.data ?? null} name={displayName(user)} />

      {sheet.isError ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            {getApiErrorMessage(sheet.error)}{' '}
            <button type="button" className="underline" onClick={() => void sheet.refetch()}>
              Thử lại
            </button>
          </CardContent>
        </Card>
      ) : data ? (
        <>
          <StatusBanner data={data} />
          <StatsStrip data={data} days={days} />
          {daysReady ? (
            <TimesheetCalendar
              key={month}
              variant={isPartTime ? 'part_time' : 'full_time'}
              month={month}
              today={today}
              days={days}
              thresholds={data.schedule.lateThresholds}
            />
          ) : (
            <Skeleton className="h-96 w-full rounded-xl" />
          )}
        </>
      ) : (
        <>
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </>
      )}
    </PageContainer>
  )
}
