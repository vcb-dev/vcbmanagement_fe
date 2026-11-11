import { Download, Info, RefreshCw, Search, Users } from 'lucide-react'
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
import { AttendanceBoardTable } from '@/features/attendance-board/AttendanceBoardTable'
import {
  WHOLE_MONTH,
  dayIndex,
  defaultRange,
  rangeDays,
  weeksOfMonth,
  type BoardRow,
} from '@/features/attendance-board/attendance-board.types'
import { BoardDaySheet } from '@/features/attendance-board/BoardDaySheet'
import { BoardSourceDialog } from '@/features/attendance-board/BoardSourceDialog'
import { buildDayCsv, buildWeekCsv } from '@/features/attendance-board/board-export'
import { useAttendanceBoard } from '@/features/attendance-board/use-attendance-board'
import { WeekRangePicker } from '@/features/attendance-board/WeekRangePicker'
import { WeeklySummaryTable } from '@/features/attendance-board/WeeklySummaryTable'
import { useDepartments } from '@/features/departments/use-departments'
import { daysOfMonth } from '@/features/my-timesheet/day-status'
import { getApiErrorMessage } from '@/lib/api-client'
import { FEATURES } from '@/lib/features'
import { downloadCsv } from '@/lib/csv'
import { formatMonth, normalizeSearch, todayYmd } from '@/lib/format'
import { displayName } from '@/lib/user-display'

const PAGE_SIZE = 12
/** Radix Select không nhận giá trị rỗng. */
const ALL = 'all'
const UNASSIGNED = 'unassigned'
const TAB_TRIGGER =
  'h-8 flex-none px-2 after:bg-primary data-active:text-primary data-active:hover:text-primary dark:data-active:text-primary'

type Mode = 'day' | 'week'

const loadedAt = (time: number) =>
  new Date(time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

/** Ngày mở khi bấm tên: ngày thiếu mốc đầu tiên trong khoảng đang xem, không có thì ngày gần nhất đã qua trong khoảng. */
function personDay(row: BoardRow, days: string[], today: string): string {
  const byDate = dayIndex(row)
  const past = days.filter((d) => d <= today)
  return past.find((d) => (byDate.get(d)?.missingCount ?? 0) > 0) ?? past[past.length - 1] ?? today
}

/** Nằm giữa dòng phân trang, dưới bảng. */
function Legend() {
  return (
    <div className="hidden min-w-0 flex-1 flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground xl:flex">
      <span className="flex items-center gap-1.5">
        <b className="font-semibold text-amber-600 tabular-nums dark:text-amber-400">08:41</b>vào muộn / ra sớm
      </span>
      <span className="flex items-center gap-1.5">
        <b className="rounded-sm bg-amber-500/15 px-1 font-semibold text-amber-600 tabular-nums ring-1 ring-amber-500/40 ring-inset dark:text-amber-400">
          --:--
        </b>
        thiếu mốc
      </span>
      <span className="flex items-center gap-1.5">
        <i className="size-1.5 rounded-full bg-sky-500" />
        giờ đã bổ sung
      </span>
      <span className="flex items-center gap-1.5">
        <i className="size-1 rounded-full bg-muted-foreground/30" />
        không chấm
      </span>
    </div>
  )
}

export function AttendanceBoardPage() {
  const today = todayYmd()
  const currentMonth = today.slice(0, 7)
  const [month, setMonth] = useState(currentMonth)
  const [mode, setMode] = useState<Mode>('day')
  const [range, setRange] = useState(() => defaultRange(currentMonth, today))
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState(ALL)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<{ userId: string; date: string } | null>(null)
  const [showSource, setShowSource] = useState(false)

  const { data: board, isPending, isError, error, refetch, isFetching, dataUpdatedAt } = useAttendanceBoard(month)
  const { data: departments = [] } = useDepartments()
  const rows = useMemo(() => board?.rows ?? [], [board])
  const weeks = useMemo(() => weeksOfMonth(month), [month])
  const days = useMemo(() => (mode === 'week' ? daysOfMonth(month) : rangeDays(month, weeks, range)), [mode, month, weeks, range])

  const filtered = useMemo(() => {
    const q = normalizeSearch(query.trim())
    return rows.filter((row) => {
      const matchesText = !q || normalizeSearch(`${displayName(row.user)} ${row.user.email}`).includes(q)
      const matchesDepartment =
        department === ALL || (department === UNASSIGNED ? !row.department : row.department?.id === department)
      return matchesText && matchesDepartment
    })
  }, [rows, query, department])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const selectedPerson = selected && rows.find((r) => r.user.id === selected.userId)

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
      downloadCsv(`bang-cham-cong-${month}-theo-tuan.csv`, buildWeekCsv(filtered, weeks))
    } else {
      const suffix = range === WHOLE_MONTH ? '' : `-tuan-${Number(range) + 1}`
      downloadCsv(`bang-cham-cong-${month}${suffix}.csv`, buildDayCsv(filtered, days))
    }
  }

  const selectPerson = (row: BoardRow) => setSelected({ userId: row.user.id, date: personDay(row, days, today) })

  return (
    <PageContainer>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h2 className="text-2xl font-semibold tracking-tight">Bảng chấm công {formatMonth(month).toLowerCase()}</h2>
          {board && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className={isFetching ? 'size-3 animate-spin' : 'size-3'} />
              Tự tải lại mỗi 30 giây. Bấm vào ô giờ để xem chi tiết hoặc bổ sung giờ. Tải lúc {loadedAt(dataUpdatedAt)}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
          <MonthNav month={month} max={currentMonth} onChange={changeMonth} />
          <Button variant="outline" disabled={!board} onClick={() => setShowSource(true)}>
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
        ) : isError && !board ? (
          <p className="py-12 text-center text-sm text-destructive">
            {getApiErrorMessage(error)}{' '}
            <button type="button" className="underline" onClick={() => void refetch()}>
              Thử lại
            </button>
          </p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <Users className="size-8 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              {rows.length === 0 ? 'Tháng này chưa có nhân sự nào.' : 'Không có nhân sự phù hợp. Thử đổi từ khoá hoặc bộ lọc.'}
            </p>
          </div>
        ) : mode === 'week' ? (
          <WeeklySummaryTable rows={pageRows} weeks={weeks} onSelectPerson={selectPerson} />
        ) : (
          <AttendanceBoardTable
            rows={pageRows}
            days={days}
            today={today}
            onSelectDay={(userId, date) => setSelected({ userId, date })}
            onSelectPerson={selectPerson}
          />
        )}

        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t px-3 py-2 text-xs text-muted-foreground">
            <span>
              Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} trong{' '}
              {filtered.length} nhân sự
            </span>
            {mode !== 'week' && <Legend />}
            <PaginationBar page={currentPage} pageCount={pageCount} onChange={setPage} />
          </div>
        )}
      </Card>

      {selected && selectedPerson && (
        <BoardDaySheet
          month={month}
          person={selectedPerson}
          date={selected.date}
          today={today}
          onDateChange={(date) => setSelected({ ...selected, date })}
          onClose={() => setSelected(null)}
        />
      )}
      {showSource && board && <BoardSourceDialog board={board} onClose={() => setShowSource(false)} />}
    </PageContainer>
  )
}
