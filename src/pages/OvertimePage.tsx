import { Download, RefreshCw, Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { MonthNav } from '@/components/month-nav'
import { PageContainer } from '@/components/page-container'
import { PaginationBar } from '@/components/pagination-bar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDepartments } from '@/features/departments/use-departments'
import { formatOvertime } from '@/features/monthly-timesheets/monthly-timesheets.types'
import { downloadOvertimeCsv } from '@/features/overtime/overtime-export'
import type { OvertimeRow } from '@/features/overtime/overtime.types'
import { OvertimeTable } from '@/features/overtime/OvertimeTable'
import { useOvertimeReport, useSetOvertimeDay } from '@/features/overtime/use-overtime'
import { getApiErrorMessage } from '@/lib/api-client'
import { FEATURES } from '@/lib/features'
import { formatDayMonth, formatMonth, normalizeSearch, todayYmd } from '@/lib/format'
import { displayName } from '@/lib/user-display'

const PAGE_SIZE = 15
/** Radix Select không nhận giá trị rỗng. */
const ALL = 'all'
const UNASSIGNED = 'unassigned'
const HAS_OVERTIME = 'has-overtime'
const TAB_TRIGGER =
  'h-8 flex-none px-2 after:bg-primary data-active:text-primary data-active:hover:text-primary dark:data-active:text-primary'

const loadedAt = (time: number) =>
  new Date(time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

export function OvertimePage() {
  const today = todayYmd()
  const currentMonth = today.slice(0, 7)
  const [month, setMonth] = useState(currentMonth)
  const [tab, setTab] = useState(ALL)
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState(ALL)
  const [page, setPage] = useState(1)

  const { data: report, isPending, isError, error, refetch, isFetching, dataUpdatedAt } = useOvertimeReport(month)
  const { data: departments = [] } = useDepartments()
  const setDay = useSetOvertimeDay(month)
  const rows = useMemo(() => report?.rows ?? [], [report])
  const withOvertime = rows.filter((r) => r.days.length > 0).length

  const filtered = useMemo(() => {
    const q = normalizeSearch(query.trim())
    return rows.filter((row) => {
      const matchesText = !q || normalizeSearch(`${displayName(row.user)} ${row.user.email}`).includes(q)
      const matchesDepartment =
        department === ALL || (department === UNASSIGNED ? !row.department : row.department?.id === department)
      return matchesText && matchesDepartment && (tab === ALL || row.days.length > 0)
    })
  }, [rows, query, department, tab])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  /** Đổi bộ lọc thì quay về trang đầu. */
  function resetPageAfter(change: () => void) {
    change()
    setPage(1)
  }

  function saveDay(row: OvertimeRow, date: string, workdays: number) {
    return setDay
      .mutateAsync({ id: row.id, date, workdays })
      .then(() =>
        toast.success(
          workdays
            ? `Đã lưu tăng ca ${formatDayMonth(date)} của ${displayName(row.user)}: ${formatOvertime(workdays)} công`
            : `Đã bỏ tăng ca ${formatDayMonth(date)} của ${displayName(row.user)}`,
        ),
      )
      .catch((err: unknown) => toast.error(getApiErrorMessage(err)))
  }

  return (
    <PageContainer>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h2 className="text-2xl font-semibold tracking-tight">Tăng ca {formatMonth(month).toLowerCase()}</h2>
          {report && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className={isFetching ? 'size-3 animate-spin' : 'size-3'} />
              Nhân sự toàn thời gian, tính bằng công. Tăng ca không cộng vào tổng công. Tải lúc {loadedAt(dataUpdatedAt)}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
          <MonthNav month={month} max={currentMonth} onChange={(next) => resetPageAfter(() => setMonth(next))} />
          {FEATURES.exportData && (
            <Button disabled={filtered.length === 0} onClick={() => downloadOvertimeCsv(month, filtered)}>
              <Download />
              Xuất dữ liệu
            </Button>
          )}
        </div>
      </div>

      <Card className="gap-0 py-0">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b px-3 pt-2 pb-[5px]">
          <Tabs value={tab} onValueChange={(next) => resetPageAfter(() => setTab(next))}>
            <TabsList variant="line" className="flex-wrap justify-start gap-y-1.5 group-data-horizontal/tabs:h-auto">
              <TabsTrigger value={ALL} className={TAB_TRIGGER}>
                Tất cả
              </TabsTrigger>
              <TabsTrigger value={HAS_OVERTIME} className={TAB_TRIGGER}>
                Có tăng ca
                {report && withOvertime > 0 && (
                  <Badge variant="secondary" className="h-4 bg-primary/10 px-1.5 text-primary tabular-nums">
                    {withOvertime}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <p className="hidden text-xs text-muted-foreground lg:block">
            Bấm vào ô của ngày để nhập số công tăng ca, ví dụ 0,5 hoặc 0,375 · Xoá trống để bỏ · Enter, ↑, ↓ để chuyển dòng
          </p>
        </div>

        <div className="flex flex-wrap gap-2 p-3">
          <div className="relative min-w-56 flex-1 sm:max-w-sm">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => resetPageAfter(() => setQuery(e.target.value))}
              placeholder="Tìm tên hoặc email…"
              aria-label="Tìm nhân sự tăng ca"
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
        </div>

        {isPending ? (
          <div className="space-y-2 p-3 pt-0">
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
          <div className="flex flex-col items-center gap-2 border-t py-14 text-center">
            <Users className="size-8 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              {rows.length === 0
                ? 'Tháng này chưa có nhân sự toàn thời gian nào.'
                : tab === HAS_OVERTIME && withOvertime === 0
                  ? 'Chưa có ai tăng ca trong tháng này.'
                  : 'Không có nhân sự phù hợp. Thử đổi từ khoá hoặc bộ lọc.'}
            </p>
          </div>
        ) : (
          <OvertimeTable month={report.month} rows={pageRows} today={today} onSave={saveDay} />
        )}

        {filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2 text-xs text-muted-foreground">
            <span>
              Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} trong{' '}
              {filtered.length} nhân sự
            </span>
            <PaginationBar page={currentPage} pageCount={pageCount} onChange={setPage} />
          </div>
        )}
      </Card>
    </PageContainer>
  )
}
