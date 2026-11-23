import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MonthNav } from '@/components/month-nav'
import { PageContainer } from '@/components/page-container'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useMe } from '@/features/auth/use-auth'
import { fullTimeLedger, ledgerDates, partTimeLedger, type LedgerFilter } from '@/features/my-timesheet/day-ledger'
import { hasStickyActions, planOf } from '@/features/my-timesheet/month-plan'
import type { MyTimesheet } from '@/features/my-timesheet/my-timesheet.types'
import { TimesheetCalendar, type CalendarFocus } from '@/features/my-timesheet/TimesheetCalendar'
import { TimesheetSummaryCard } from '@/features/my-timesheet/TimesheetSummaryCard'
import { useMyTimesheet } from '@/features/my-timesheet/use-my-timesheet'
import { DisputeDialog } from '@/features/part-time/DisputeDialog'
import { FeedbackThread } from '@/features/part-time/FeedbackThread'
import { useMyPartTimeDays } from '@/features/part-time/use-part-time'
import { useElementWidth } from '@/hooks/use-element-width'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatDate, formatMonth, todayYmd } from '@/lib/format'
import { EMPLOYMENT_LABEL } from '@/lib/user-display'

/**
 * Từ bề rộng này trang chia hai cột: danh sách ngày bên trái (đủ 800px cho bảng) và cột phải 20rem
 * giữ thẻ tổng công cùng nút xác nhận luôn trong tầm mắt khi cuộn qua các ngày.
 */
const TWO_COLUMN_MIN = 1136

/** Vị trí dính ngay dưới thanh tiêu đề của app. */
const BELOW_APP_HEADER = 'calc(3.5rem + env(safe-area-inset-top, 0px))'

/**
 * Màn rộng: trang cao tối thiểu bằng phần màn hình dưới thanh tiêu đề (trừ lề khung 0,5rem × 2 và đệm trang 1rem × 2),
 * để lịch và cột phải kéo xuống tới đáy thay vì dồn lên trên, chừa khoảng trống phía dưới.
 * Trần 50rem: màn rất cao thì dừng lại, mỗi dòng của bảng tuần không cao quá ~80px.
 */
const FILL_HEIGHT = `min(calc(100dvh - ${BELOW_APP_HEADER} - 3rem), 50rem)`

/** Một dòng phụ về hồ sơ: bộ phận, loại nhân sự, ngày ký hợp đồng và giờ các ca. */
function ProfileLine({ data }: { data: MyTimesheet }) {
  const { profile, schedule } = data
  const isPartTime = profile.employmentType === 'part_time'
  const facts = [
    profile.department?.name,
    EMPLOYMENT_LABEL[profile.employmentType],
    profile.contractStartDate && `Ký HĐ ${formatDate(profile.contractStartDate)}`,
  ].filter(Boolean)
  const shifts = [
    `Sáng ${schedule.morningStart}–${schedule.morningEnd}`,
    `Chiều ${schedule.afternoonStart}–${schedule.afternoonEnd}`,
    schedule.evening && `Tối ${schedule.evening.start}–${schedule.evening.end}`,
  ].filter(Boolean)

  return (
    <div className="space-y-1.5 text-sm text-muted-foreground">
      <p className="flex flex-wrap gap-x-3 gap-y-0.5 tabular-nums">
        <span>{facts.join(' · ')}</span>
        {shifts.map((s) => (
          <span key={s} className="whitespace-nowrap">
            {s}
          </span>
        ))}
      </p>
      {!profile.department && (
        <Badge variant="secondary" className="h-auto min-h-5 shrink bg-amber-500/10 text-left whitespace-normal text-amber-800 dark:text-amber-300">
          {isPartTime ? 'Chưa gán bộ phận, chưa tính được công' : 'Chưa gán bộ phận, đang dùng giờ mặc định'}
        </Badge>
      )}
    </div>
  )
}

/**
 * Công của tôi. Thứ tự theo câu hỏi của nhân viên: tháng này được bao nhiêu công, có gì cần xem (thẻ tổng công),
 * từng ngày ra sao (danh sách ngày), rồi trao đổi với quản lý. Màn rộng thì thẻ tổng công và trao đổi sang cột phải.
 */
export function MyTimesheetPage() {
  const [searchParams] = useSearchParams()
  const { data: user } = useMe()
  const today = todayYmd()
  const currentMonth = today.slice(0, 7)
  const initialMonth = searchParams.get('month')
  const [month, setMonth] = useState(() => {
    return initialMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(initialMonth) ? initialMonth : currentMonth
  })
  const [focus, setFocus] = useState<CalendarFocus | null>(null)
  const [filter, setFilter] = useState<LedgerFilter>('all')
  /** Báo sai một ngày: nội dung điền sẵn; `at` làm key để hộp nạp lại nội dung mỗi lần mở. */
  const [dayDispute, setDayDispute] = useState<{ text: string; at: number } | null>(null)
  const [pageRef, pageWidth] = useElementWidth<HTMLDivElement>()
  const wide = pageWidth >= TWO_COLUMN_MIN

  const sheet = useMyTimesheet(month)
  const monthReady = sheet.data?.month === month
  const data = monthReady ? sheet.data! : null

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

  function changeMonth(next: string) {
    setMonth(next)
    setFilter('all')
    // Lịch dựng lại theo tháng; bỏ yêu cầu cuộn cũ để đổi tháng không kéo trang xuống lịch.
    setFocus(null)
  }

  /** Lọc lịch theo các ngày đó và cuộn tới lịch, khi bấm một chỉ số ở thẻ tổng công. */
  function showDays(next: LedgerFilter) {
    setFilter(next)
    setFocus({ at: Date.now() })
  }

  if (!user) return null

  const variant = isPartTime ? 'part_time' : 'full_time'
  const dispute = data ? planOf(data).dispute : null
  const ledgerReady = data && (!isPartTime || !data.profile.department || ptDays.data)

  const verdict = data ? (
    <TimesheetSummaryCard data={data} days={days} onShowDays={showDays} />
  ) : (
    <Skeleton className="h-96 w-full rounded-xl" />
  )

  const ledger = ledgerReady ? (
    <TimesheetCalendar
      key={month}
      variant={variant}
      month={month}
      today={today}
      days={days}
      thresholds={data.schedule.lateThresholds}
      filter={filter}
      onFilterChange={setFilter}
      focus={focus}
      onDispute={dispute ? (text) => setDayDispute({ text, at: Date.now() }) : undefined}
      className={wide ? 'flex-1' : undefined}
    />
  ) : (
    <Skeleton className={wide ? 'w-full flex-1 rounded-xl' : 'h-96 w-full rounded-xl'} />
  )

  const conversation = data && (
    <FeedbackThread
      sheetId={data.sheet?.id ?? null}
      sheetType={isPartTime ? 'part_time' : 'full_time'}
      mode="staff"
      readOnly={data.sheet?.status === 'confirmed'}
      currentMonth={month}
      onSelectMonth={changeMonth}
    />
  )

  return (
    <PageContainer>
      <div ref={pageRef} className="flex flex-col gap-4" style={wide ? { minHeight: FILL_HEIGHT } : undefined}>
        {/* Điện thoại: chọn tháng dính dưới thanh tiêu đề, đổi tháng được ở bất kỳ đâu trong danh sách ngày. */}
        <div className="sticky z-20 -mx-3 -mt-4 border-b bg-background px-3 py-2 sm:hidden" style={{ top: BELOW_APP_HEADER }}>
          <MonthNav month={month} max={currentMonth} onChange={changeMonth} className="justify-between" />
        </div>

        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0 space-y-1">
            <h2 className="sr-only sm:not-sr-only sm:text-2xl sm:font-semibold sm:tracking-tight">Công {formatMonth(month).toLowerCase()}</h2>
            {sheet.data ? <ProfileLine data={sheet.data} /> : <Skeleton className="h-5 w-full max-w-80" />}
          </div>
          <MonthNav month={month} max={currentMonth} onChange={changeMonth} className="hidden sm:flex" />
        </header>

        {sheet.isError ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-destructive">
              {getApiErrorMessage(sheet.error)}{' '}
              <button type="button" className="underline underline-offset-2" onClick={() => void sheet.refetch()}>
                Thử lại
              </button>
            </CardContent>
          </Card>
        ) : wide ? (
          <div className="grid flex-1 grid-cols-[minmax(0,1fr)_20rem] gap-4">
            {/* Cột phải đứng trước trong DOM: bàn phím và trình đọc màn hình gặp kết luận và nút xác nhận trước. */}
            <aside aria-label="Tổng kết tháng" className="col-start-2 row-start-1 min-w-0">
              {/*
                Cao bằng lịch nhưng không quá một màn hình: cả cột dính cùng nhau khi lịch dài hơn màn hình,
                cao hơn màn hình thì cuộn bên trong cột. Khối trao đổi giãn nốt phần còn lại để hai cột cùng chạm đáy.
              */}
              <div
                className="sticky flex h-full flex-col gap-4 overflow-y-auto overscroll-contain rounded-xl [scrollbar-width:thin]"
                style={{
                  top: `calc(${BELOW_APP_HEADER} + 1rem)`,
                  maxHeight: `calc(100dvh - ${BELOW_APP_HEADER} - 2rem)`,
                }}
              >
                <div className="shrink-0">{verdict}</div>
                {conversation && <div className="grid flex-[1_0_auto]">{conversation}</div>}
              </div>
            </aside>
            <div className="col-start-1 row-start-1 flex min-w-0 flex-col">{ledger}</div>
          </div>
        ) : (
          <div className="space-y-6">
            {verdict}
            {ledger}
            {conversation}
          </div>
        )}

        {dispute && dayDispute && (
          <DisputeDialog
            key={dayDispute.at}
            sheetId={dispute.sheetId}
            sheetType={dispute.sheetType}
            initialContent={dayDispute.text}
            open
            onOpenChange={(open) => !open && setDayDispute(null)}
          />
        )}

        {/* Chừa chỗ cho thanh xác nhận dính ở đáy trên điện thoại. */}
        {data && hasStickyActions(data) && <div className="h-16 md:hidden" aria-hidden="true" />}
      </div>
    </PageContainer>
  )
}
