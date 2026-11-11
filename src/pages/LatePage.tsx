import { Download, Info, Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { MonthNav } from '@/components/month-nav'
import { PageContainer } from '@/components/page-container'
import { PaginationBar } from '@/components/pagination-bar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  WHOLE_MONTH,
  defaultRange,
  rangeDays,
  rangeLabel,
  weeksOfMonth,
} from '@/features/attendance-board/attendance-board.types'
import { WeekRangePicker } from '@/features/attendance-board/WeekRangePicker'
import { useDepartments } from '@/features/departments/use-departments'
import { buildLateDayCsv, buildLateWeekCsv } from '@/features/late/late-export'
import { lateTotal } from '@/features/late/late.types'
import { LateDayTable } from '@/features/late/LateDayTable'
import { LateDetailSheet } from '@/features/late/LateDetailSheet'
import { LateSourceDialog } from '@/features/late/LateSourceDialog'
import { LateWeekSummaryTable } from '@/features/late/LateWeekSummaryTable'
import { useLateReport } from '@/features/late/use-late-report'
import { daysOfMonth } from '@/features/my-timesheet/day-status'
import { getApiErrorMessage } from '@/lib/api-client'
import { downloadCsv } from '@/lib/csv'
import { FEATURES } from '@/lib/features'
import { formatHoursMinutes, formatMonth, normalizeSearch, todayYmd } from '@/lib/format'
import { displayName } from '@/lib/user-display'

const PAGE_SIZE = 12
/** Radix Select không nhận giá trị rỗng. */
const ALL = 'all'
const UNASSIGNED = 'unassigned'
const LATE_ONLY = 'late-only'
const TAB_TRIGGER =
  'h-8 flex-none px-2 after:bg-primary data-active:text-primary data-active:hover:text-primary dark:data-active:text-primary'

type Mode = 'day' | 'week'

/**
 * Đi muộn: thống kê các lần vào muộn của nhân sự để quản lý nắm được, cùng cách xem với Bảng chấm công.
 * Theo ngày xem từng tuần, mỗi người hai dòng Sáng, Chiều; Tổng hợp tuần đếm số lần của từng tuần trong tháng.
 */
export function LatePage() {
  const today = todayYmd()
  const currentMonth = today.slice(0, 7)
  const [month, setMonth] = useState(currentMonth)
  const [mode, setMode] = useState<Mode>('day')
  const [range, setRange] = useState(() => defaultRange(currentMonth, today))
  const [show, setShow] = useState(LATE_ONLY)
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState(ALL)
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showSource, setShowSource] = useState(false)

  const { data: report, isPending, isError, error, refetch } = useLateReport(month)
  const { data: departments = [] } = useDepartments()
  const rows = useMemo(() => report?.rows ?? [], [report])
  const weeks = useMemo(() => weeksOfMonth(month), [month])
  /** Ngày đang xem: tuần (hoặc cả tháng) đã chọn ở Theo ngày, cả tháng ở Tổng hợp tuần. */
  const days = useMemo(() => (mode === 'week' ? daysOfMonth(month) : rangeDays(month, weeks, range)), [mode, month, weeks, range])
  const rangeName =
    mode === 'week' || range === WHOLE_MONTH ? formatMonth(month) : `Tuần ${Number(range) + 1} (${rangeLabel(days)})`

  const matched = useMemo(() => {
    const q = normalizeSearch(query.trim())
    return rows.filter((row) => {
      const matchesText = !q || normalizeSearch(`${displayName(row.user)} ${row.user.email}`).includes(q)
      const matchesDepartment =
        department === ALL || (department === UNASSIGNED ? !row.department : row.department?.id === department)
      return matchesText && matchesDepartment
    })
  }, [rows, query, department])

  /** Người có đi muộn trong các ngày đang xem, và tổng của họ để hiện ở đầu bảng. */
  const { lateRows, total } = useMemo(() => {
    const inRange = new Set(days)
    const late = matched.filter((row) => row.events.some((e) => inRange.has(e.date)))
    return {
      lateRows: late,
      total: late.reduce(
        (sum, row) => {
          const t = lateTotal(row.events, inRange)
          return { count: sum.count + t.count, minutes: sum.minutes + t.minutes }
        },
        { count: 0, minutes: 0 },
      ),
    }
  }, [matched, days])

  const filtered = show === LATE_ONLY ? lateRows : matched
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const selected = rows.find((r) => r.user.id === selectedId)

  /** Đổi bộ lọc thì quay về trang đầu. */
  function resetPageAfter(change: () => void) {
    change()
    setPage(1)
  }

  function changeMonth(next: string) {
    resetPageAfter(() => {
      setMonth(next)
      setRange(defaultRange(next, today))
    })
  }

  function exportCsv() {
    if (mode === 'week') {
      downloadCsv(`di-muon-${month}-theo-tuan.csv`, buildLateWeekCsv(filtered, weeks))
    } else {
      const suffix = range === WHOLE_MONTH ? '' : `-tuan-${Number(range) + 1}`
      downloadCsv(`di-muon-${month}${suffix}.csv`, buildLateDayCsv(filtered, days))
    }
  }

  function emptyText(): string {
    if (rows.length === 0) return 'Tháng này chưa có nhân sự nào.'
    if (matched.length > 0 && show === LATE_ONLY) {
      return mode === 'week' || range === WHOLE_MONTH ? 'Không ai đi muộn trong tháng này.' : 'Không ai đi muộn trong tuần này.'
    }
    return 'Không có nhân sự phù hợp. Thử đổi từ khoá hoặc bộ lọc.'
  }

  return (
    <PageContainer>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h2 className="text-2xl font-semibold tracking-tight">Đi muộn {formatMonth(month).toLowerCase()}</h2>
          <p className="text-xs text-muted-foreground">
            Mỗi ca vào sau giờ vào ca của bộ phận là một lần đi muộn. Bấm vào tên để xem chi tiết cả tháng.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
          <MonthNav month={month} max={currentMonth} onChange={changeMonth} />
          <Button variant="outline" disabled={!report} onClick={() => setShowSource(true)}>
            <Info />
            Nguồn dữ liệu
          </Button>
          {FEATURES.exportData && (
            <Button disabled={filtered.length === 0} onClick={exportCsv}>
              <Download />
              Xuất dữ liệu
            </Button>
          )}
        </div>
      </div>

      <Card className="gap-0 py-0">
        {/* Tab và bộ lọc chung một hàng. Hẹp không đủ chỗ thì bộ lọc lên trên (wrap-reverse) để tab vẫn sát đường kẻ. */}
        <div className="flex flex-wrap-reverse items-center justify-between gap-x-4 gap-y-2 border-b px-3 pt-2 pb-[5px]">
          <Tabs value={mode} onValueChange={(next) => resetPageAfter(() => setMode(next as Mode))}>
            <TabsList variant="line" className="flex-wrap justify-start gap-y-1.5 group-data-horizontal/tabs:h-auto">
              <TabsTrigger value="day" className={TAB_TRIGGER}>
                Theo ngày
              </TabsTrigger>
              <TabsTrigger value="week" className={TAB_TRIGGER}>
                Tổng hợp tuần
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <div className="relative min-w-48 flex-1 sm:w-48 sm:flex-none">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => resetPageAfter(() => setQuery(e.target.value))}
                placeholder="Tìm tên hoặc email…"
                aria-label="Tìm nhân sự"
                className="pl-9"
              />
            </div>
            <Select value={department} onValueChange={(next) => resetPageAfter(() => setDepartment(next))}>
              <SelectTrigger aria-label="Lọc theo bộ phận" className="min-w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả bộ phận</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
                <SelectItem value={UNASSIGNED}>Chưa gán bộ phận</SelectItem>
              </SelectContent>
            </Select>
            <Select value={show} onValueChange={(next) => resetPageAfter(() => setShow(next))}>
              <SelectTrigger aria-label="Nhân sự hiển thị" className="min-w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={LATE_ONLY}>Chỉ người có đi muộn</SelectItem>
                <SelectItem value={ALL}>Tất cả nhân sự</SelectItem>
              </SelectContent>
            </Select>
            {mode !== 'week' && (
              <WeekRangePicker month={month} weeks={weeks} value={range} onChange={(next) => resetPageAfter(() => setRange(next))} />
            )}
          </div>
        </div>

        {isPending ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : isError && !report ? (
          <p className="py-12 text-center text-sm text-destructive">
            {getApiErrorMessage(error)}{' '}
            <button type="button" className="underline" onClick={() => void refetch()}>
              Thử lại
            </button>
          </p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <Users className="size-8 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">{emptyText()}</p>
          </div>
        ) : mode === 'week' ? (
          <LateWeekSummaryTable rows={pageRows} weeks={weeks} onSelectPerson={(row) => setSelectedId(row.user.id)} />
        ) : (
          <LateDayTable rows={pageRows} days={days} today={today} onSelectPerson={(row) => setSelectedId(row.user.id)} />
        )}

        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t px-3 py-2 text-xs text-muted-foreground">
            <span>
              Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} trong{' '}
              {filtered.length} nhân sự
            </span>
            <p className="tabular-nums">
              {rangeName}:{' '}
              {lateRows.length > 0 ? (
                <>
                  <b className="font-semibold text-amber-600 dark:text-amber-400">{lateRows.length} người</b> đi muộn ·{' '}
                  {total.count} lần · {formatHoursMinutes(total.minutes)}
                </>
              ) : (
                'không ai đi muộn'
              )}
            </p>
            <PaginationBar page={currentPage} pageCount={pageCount} onChange={setPage} />
          </div>
        )}
      </Card>

      {selected && report && <LateDetailSheet month={report.month} row={selected} onClose={() => setSelectedId(null)} />}
      {showSource && report && <LateSourceDialog report={report} onClose={() => setShowSource(false)} />}
    </PageContainer>
  )
}
