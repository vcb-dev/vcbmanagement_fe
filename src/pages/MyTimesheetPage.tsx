import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { UserAvatar } from '@/components/layout/nav-user'
import { MonthNav } from '@/components/month-nav'
import { PageContainer } from '@/components/page-container'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useMe } from '@/features/auth/use-auth'
import { DayDetailCard } from '@/features/my-timesheet/DayDetailCard'
import { MonthCalendar } from '@/features/my-timesheet/MonthCalendar'
import type { MyTimesheet } from '@/features/my-timesheet/my-timesheet.types'
import { TimesheetSummaryCard } from '@/features/my-timesheet/TimesheetSummaryCard'
import { useMyTimesheet } from '@/features/my-timesheet/use-my-timesheet'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatDate, todayYmd } from '@/lib/format'
import { EMPLOYMENT_LABEL, displayName } from '@/lib/user-display'

function ProfileLine({ data }: { data: MyTimesheet }) {
  const { profile, schedule } = data
  const parts = [
    profile.department?.name,
    EMPLOYMENT_LABEL[profile.employmentType],
    profile.contractStartDate && `Ký HĐ ${formatDate(profile.contractStartDate)}`,
  ].filter(Boolean)
  return (
    <div className="space-y-1 text-sm text-muted-foreground">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {parts.join(' · ')}
        {!profile.department && (
          <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
            Chưa gán bộ phận, đang dùng giờ mặc định
          </Badge>
        )}
      </p>
      <p className="tabular-nums">
        Ca sáng {schedule.morningStart}–{schedule.morningEnd} · Ca chiều {schedule.afternoonStart}–{schedule.afternoonEnd}
      </p>
    </div>
  )
}

export function MyTimesheetPage() {
  const { data: user } = useMe()
  const today = todayYmd()
  const currentMonth = today.slice(0, 7)
  const [month, setMonth] = useState(currentMonth)
  const [picked, setPicked] = useState<string | null>(null)

  const sheet = useMyTimesheet(month)
  const monthReady = sheet.data?.month === month

  const records = useMemo(
    () => new Map((monthReady ? sheet.data!.records : []).map((r) => [r.workDate, r])),
    [sheet.data, monthReady],
  )

  const defaultDay = month === currentMonth ? today : (monthReady && sheet.data!.records[0]?.workDate) || `${month}-01`
  const selected = picked?.startsWith(month) ? picked : defaultDay

  if (!user) return null

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
        <MonthNav
          month={month}
          max={currentMonth}
          onChange={(next) => {
            setMonth(next)
            setPicked(null)
          }}
        />
      </Card>

      {sheet.isError ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-destructive">
            {getApiErrorMessage(sheet.error)}{' '}
            <button type="button" className="underline" onClick={() => void sheet.refetch()}>
              Thử lại
            </button>
          </CardContent>
        </Card>
      ) : monthReady ? (
        <TimesheetSummaryCard data={sheet.data!} />
      ) : (
        <Skeleton className="h-52 w-full rounded-xl" />
      )}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Lịch chấm công của tôi</CardTitle>
            <CardDescription>
              Chọn một ngày để xem chi tiết các mốc giờ. Cần chấm công thì vào mục{' '}
              <Link to="/attendance" className="font-medium text-primary underline-offset-2 hover:underline">
                Chấm công
              </Link>
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sheet.isError ? (
              <p className="py-8 text-center text-sm text-destructive">
                {getApiErrorMessage(sheet.error)}{' '}
                <button type="button" className="underline" onClick={() => void sheet.refetch()}>
                  Thử lại
                </button>
              </p>
            ) : monthReady ? (
              <MonthCalendar month={month} records={records} today={today} selected={selected} onSelect={setPicked} />
            ) : (
              <Skeleton className="h-96 w-full" />
            )}
          </CardContent>
        </Card>

        {monthReady ? (
          <DayDetailCard
            ymd={selected}
            record={records.get(selected)}
            today={today}
            thresholds={sheet.data!.schedule.lateThresholds}
          />
        ) : (
          <Skeleton className="h-96 w-full rounded-xl" />
        )}
      </div>
    </PageContainer>
  )
}
