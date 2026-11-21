import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MonthNav } from '@/components/month-nav'
import { PageContainer } from '@/components/page-container'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DayTab } from '@/features/overview/DayTab'
import { MonthTab } from '@/features/overview/MonthTab'
import { useOverview, useOverviewMonth } from '@/features/overview/use-overview'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatDate, formatDayMonth, formatWorkDate, shiftYmd, todayYmd } from '@/lib/format'
import { cn } from '@/lib/utils'

type Tab = 'day' | 'month'

const YMD = /^\d{4}-\d{2}-\d{2}$/
const YM = /^\d{4}-\d{2}$/

/**
 * Trang Tổng quan cho admin / quản lý, hai tab:
 * - Ngày (mặc định hôm nay): đi làm / không đi làm, đi muộn, đơn xin đi muộn / về sớm, danh sách người, theo bộ phận;
 * - Tháng: các chỉ số đó cộng dồn tới hết hôm qua, từng ngày, theo bộ phận, đi muộn nhiều nhất.
 * Tab, ngày và tháng lưu trên URL (`?tab=month&month=`, `?date=`); tháng mặc định là tháng của ngày đang xem.
 */
export function OverviewPage() {
  const today = todayYmd()
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('tab') === 'month' ? 'month' : 'day'
  const requestedDate = params.get('date')
  const date = requestedDate && YMD.test(requestedDate) && requestedDate <= today ? requestedDate : today
  const isToday = date === today
  const requestedMonth = params.get('month')
  const month =
    requestedMonth && YM.test(requestedMonth) && requestedMonth <= today.slice(0, 7) ? requestedMonth : date.slice(0, 7)

  const day = useOverview(date, { isToday, enabled: tab === 'day' })
  const monthly = useOverviewMonth(month, { enabled: tab === 'month' })
  const active = tab === 'day' ? day : monthly

  function navigate(next: { tab?: Tab; date?: string; month?: string }) {
    const t = next.tab ?? tab
    const d = next.date ?? date
    const m = next.month ?? (next.date ? next.date.slice(0, 7) : month)
    const search: Record<string, string> = {}
    if (t === 'month') search.tab = 'month'
    if (d !== today) search.date = d
    if (t === 'month' && m !== d.slice(0, 7)) search.month = m
    setParams(search, { replace: true })
  }

  function goToDate(next: string) {
    if (next && next <= today) navigate({ date: next })
  }

  const updatedAt = active.dataUpdatedAt
    ? new Date(active.dataUpdatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : null

  let subtitle: ReactNode
  if (tab === 'day') {
    subtitle = (
      <>
        <span className="font-medium text-foreground first-letter:uppercase">{formatWorkDate(date, { long: true })}</span>
        {isToday && <Badge variant="secondary">Hôm nay</Badge>}
        {isToday && updatedAt && (
          <span>
            · Cập nhật lúc {updatedAt}
            <span className="hidden sm:inline">, tự làm mới mỗi phút</span>
          </span>
        )}
      </>
    )
  } else {
    const m = monthly.data?.month === month ? monthly.data : undefined
    subtitle = m ? (
      m.to === null ? (
        <span>Tháng này chưa có ngày nào kết thúc</span>
      ) : (
        <>
          <span className="font-medium text-foreground">
            {formatDayMonth(m.from)} – {formatDate(m.to)}
          </span>
          <span>
            · {m.days} ngày làm việc{m.to === shiftYmd(m.today, -1) && ', tính tới hết hôm qua'}
          </span>
        </>
      )
    ) : (
      <span>Đang tải…</span>
    )
  }

  return (
    <PageContainer>
      <header className="flex flex-col gap-3 pb-1 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">Tổng quan</h2>
            <Tabs value={tab} onValueChange={(v) => navigate({ tab: v as Tab })}>
              <TabsList>
                <TabsTrigger value="day" className="px-3">
                  Theo ngày
                </TabsTrigger>
                <TabsTrigger value="month" className="px-3">
                  Theo tháng
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {tab === 'day' ? (
            <>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon-sm" onClick={() => goToDate(shiftYmd(date, -1))} aria-label="Xem ngày trước">
                  <ChevronLeft />
                </Button>
                <Input
                  type="date"
                  value={date}
                  max={today}
                  onChange={(e) => goToDate(e.target.value)}
                  className="h-8 w-36 sm:w-40"
                  aria-label="Chọn ngày cần xem"
                />
                <Button variant="outline" size="icon-sm" onClick={() => goToDate(shiftYmd(date, 1))} disabled={isToday} aria-label="Xem ngày sau">
                  <ChevronRight />
                </Button>
              </div>
              {!isToday && (
                <Button variant="outline" size="sm" onClick={() => goToDate(today)}>
                  Về hôm nay
                </Button>
              )}
            </>
          ) : (
            <MonthNav month={month} max={today.slice(0, 7)} onChange={(m) => navigate({ month: m })} />
          )}
          {/* Điện thoại chỉ để biểu tượng, để cả hàng chọn ngày vừa một dòng. */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void active.refetch()}
            disabled={active.isFetching}
            aria-label="Làm mới"
            title="Làm mới"
          >
            <RefreshCw className={cn(active.isFetching && 'animate-spin')} />
            <span className="hidden sm:inline">Làm mới</span>
          </Button>
        </div>
      </header>

      {active.isError && !active.data ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="font-medium">Chưa tải được số liệu tổng quan</p>
            <p className="text-sm text-muted-foreground">{getApiErrorMessage(active.error)}</p>
            <Button variant="outline" onClick={() => void active.refetch()}>
              Thử lại
            </Button>
          </CardContent>
        </Card>
      ) : tab === 'day' ? (
        day.data ? (
          <div className={cn('transition-opacity', day.isFetching && day.data.date !== date && 'opacity-60')}>
            <DayTab data={day.data} isToday={day.data.date === day.data.today} />
          </div>
        ) : (
          <OverviewSkeleton />
        )
      ) : monthly.data ? (
        <div className={cn('transition-opacity', monthly.isFetching && monthly.data.month !== month && 'opacity-60')}>
          <MonthTab data={monthly.data} onSelectDate={(d) => navigate({ tab: 'day', date: d })} />
        </div>
      ) : (
        <OverviewSkeleton />
      )}
    </PageContainer>
  )
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Đang tải số liệu">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className={cn('h-28 rounded-xl', i === 0 && 'col-span-2 lg:col-span-1')} />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-[34rem] rounded-xl xl:col-span-2" />
        <Skeleton className="h-[34rem] rounded-xl" />
      </div>
    </div>
  )
}
