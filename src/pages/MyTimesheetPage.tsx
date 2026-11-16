import { CalendarDays } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { UserAvatar } from '@/components/layout/nav-user'
import { MonthNav } from '@/components/month-nav'
import { PageContainer } from '@/components/page-container'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useMe } from '@/features/auth/use-auth'
import { DayLedger, LedgerFilterBar, type LedgerFilter, type LedgerFocus } from '@/features/my-timesheet/DayLedger'
import { fullTimeLedger, ledgerDates, partTimeLedger } from '@/features/my-timesheet/day-ledger'
import type { MyTimesheet } from '@/features/my-timesheet/my-timesheet.types'
import { TimesheetSummaryCard } from '@/features/my-timesheet/TimesheetSummaryCard'
import { useMyTimesheet } from '@/features/my-timesheet/use-my-timesheet'
import { FeedbackThread } from '@/features/part-time/FeedbackThread'
import { useMyPartTimeDays } from '@/features/part-time/use-part-time'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatDate, formatMonth, todayYmd } from '@/lib/format'
import { EMPLOYMENT_LABEL, displayName } from '@/lib/user-display'

function ProfileLine({ data }: { data: MyTimesheet }) {
  const { profile, schedule } = data
  const isPartTime = profile.employmentType === 'part_time'
  const parts = [
    profile.department?.name,
    EMPLOYMENT_LABEL[profile.employmentType],
    profile.contractStartDate && `Ký HĐ ${formatDate(profile.contractStartDate)}`,
  ].filter(Boolean)

  let shiftSchedule = `Ca sáng ${schedule.morningStart}–${schedule.morningEnd} · Ca chiều ${schedule.afternoonStart}–${schedule.afternoonEnd}`
  if (schedule.evening) {
    shiftSchedule += ` · Ca tối ${schedule.evening.start}–${schedule.evening.end}`
  }

  return (
    <div className="space-y-1 text-sm text-muted-foreground">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {parts.join(' · ')}
        {!profile.department && (
          <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
            {isPartTime
              ? 'Chưa gán bộ phận, chưa tính được công'
              : 'Chưa gán bộ phận, đang dùng giờ mặc định'}
          </Badge>
        )}
      </p>
      <p className="tabular-nums">{shiftSchedule}</p>
    </div>
  )
}

export function MyTimesheetPage() {
  const [searchParams] = useSearchParams()
  const { data: user } = useMe()
  const today = todayYmd()
  const currentMonth = today.slice(0, 7)
  const initialMonth = searchParams.get('month')
  const [month, setMonth] = useState(() => {
    return initialMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(initialMonth)
      ? initialMonth
      : currentMonth
  })
  const [focus, setFocus] = useState<LedgerFocus | null>(null)
  const [filter, setFilter] = useState<LedgerFilter>('all')

  const sheet = useMyTimesheet(month)
  const monthReady = sheet.data?.month === month
  const data = monthReady ? sheet.data! : null

  const isPartTime = sheet.data?.profile.employmentType === 'part_time'
  const ptDays = useMyPartTimeDays(
    month,
    Boolean(isPartTime && sheet.data?.profile.department),
  )

  const records = useMemo(
    () => new Map((data?.records ?? []).map((r) => [r.workDate, r])),
    [data],
  )

  const ptDaysMap = useMemo(
    () => new Map((ptDays.data ?? []).map((d) => [d.date, d])),
    [ptDays.data],
  )

  const days = useMemo(() => {
    if (!data) return []
    const dates = ledgerDates(month, today)
    return isPartTime
      ? partTimeLedger(dates, ptDaysMap, records, data.schedule, today)
      : fullTimeLedger(dates, records, data.fullTime?.overtimeDays ?? [], data.schedule, today)
  }, [data, isPartTime, month, today, ptDaysMap, records])

  function changeMonth(next: string) {
    setMonth(next)
    setFilter('all')
  }

  /** Chuyển xuống bảng theo ngày với một bộ lọc, khi bấm "Xem ngày" ở thẻ tổng hợp. */
  function showDays(next: LedgerFilter) {
    setFilter(next)
    setFocus({ at: Date.now() })
  }

  if (!user) return null

  const retry = (
    <>
      {getApiErrorMessage(sheet.error)}{' '}
      <button type="button" className="underline" onClick={() => void sheet.refetch()}>
        Thử lại
      </button>
    </>
  )

  return (
    <PageContainer>
      <Card className="flex-row flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar user={user} className="size-11 rounded-lg" />
          <div className="min-w-0 space-y-1">
            <h2 className="truncate text-xl font-semibold tracking-tight">Xin chào, {displayName(user)}</h2>
            {sheet.data ? <ProfileLine data={sheet.data} /> : <Skeleton className="h-10 w-72" />}
          </div>
        </div>
        <MonthNav month={month} max={currentMonth} onChange={changeMonth} />
      </Card>

      {sheet.isError ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">{retry}</CardContent>
        </Card>
      ) : data ? (
        <div className="space-y-4">
          <TimesheetSummaryCard data={data} days={days} onShowDays={showDays} />
          <FeedbackThread
            sheetId={data.sheet?.id ?? null}
            sheetType={isPartTime ? 'part_time' : 'full_time'}
            mode="staff"
            readOnly={data.sheet?.status === 'confirmed'}
            currentMonth={month}
            onSelectMonth={changeMonth}
          />
        </div>
      ) : (
        <Skeleton className="h-80 w-full rounded-xl" />
      )}

      {!sheet.isError && (
        <section className="space-y-3 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground/80 ring-1 ring-foreground/10">
                <CalendarDays className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg leading-6 font-semibold tracking-tight">Lịch làm việc {formatMonth(month).toLowerCase()}</h2>
                <p className="text-sm text-muted-foreground">Giờ vào, ra và ghi chú của từng ngày</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {data && (
                <LedgerFilterBar variant={isPartTime ? 'part_time' : 'full_time'} days={days} value={filter} onChange={setFilter} />
              )}
              <MonthNav month={month} max={currentMonth} onChange={changeMonth} />
            </div>
          </div>

          {data && (!isPartTime || !data.profile.department || ptDays.data) ? (
            <DayLedger
              variant={isPartTime ? 'part_time' : 'full_time'}
              days={days}
              thresholds={data.schedule.lateThresholds}
              filter={filter}
              focus={focus}
            />
          ) : (
            <Skeleton className="h-96 w-full rounded-xl" />
          )}
        </section>
      )}
    </PageContainer>
  )
}
