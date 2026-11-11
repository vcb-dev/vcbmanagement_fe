import { Download, Info, RefreshCw, Search, Users } from 'lucide-react'
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
import { downloadMonthlyCsv } from '@/features/monthly-timesheets/monthly-export'
import {
  MANUAL_FIELDS,
  STATUS_LABEL,
  formatWorkdays,
  type ConfirmationStatus,
  type FullTimeTimesheetRow,
  type ManualField,
} from '@/features/monthly-timesheets/monthly-timesheets.types'
import { MonthlyDetailSheet } from '@/features/monthly-timesheets/MonthlyDetailSheet'
import { MonthlySourceDialog } from '@/features/monthly-timesheets/MonthlySourceDialog'
import { MonthlyTimesheetTable } from '@/features/monthly-timesheets/MonthlyTimesheetTable'
import { useFullTimeTimesheets, useUpdateFullTimeTimesheet } from '@/features/monthly-timesheets/use-monthly-timesheets'
import { getApiErrorMessage } from '@/lib/api-client'
import { FEATURES } from '@/lib/features'
import { formatMonth, normalizeSearch, todayYmd } from '@/lib/format'
import { displayName } from '@/lib/user-display'

const PAGE_SIZE = 15
/** Radix Select không nhận giá trị rỗng. */
const ALL = 'all'
const UNASSIGNED = 'unassigned'
const TAB_TRIGGER =
  'h-8 flex-none px-2 after:bg-primary data-active:text-primary data-active:hover:text-primary dark:data-active:text-primary'
const STATUS_TABS: ConfirmationStatus[] = ['confirmed', 'pending', 'disputed']

const EXTRA_FILTERS: { value: string; label: string; match: (r: FullTimeTimesheetRow) => boolean }[] = [
  { value: 'overtime', label: 'Có tăng ca', match: (r) => r.overtimeWorkdays > 0 },
  { value: 'missing', label: 'Có thiếu chấm', match: (r) => r.missingPunchCount > 0 },
  { value: 'late', label: 'Có đi muộn', match: (r) => r.lateCount > 0 },
  { value: 'excused', label: 'Có xin phép', match: (r) => r.excusedWorkdays > 0 },
  { value: 'leave', label: 'Có nghỉ phép', match: (r) => r.leaveWorkdays > 0 },
  { value: 'no-leave-balance', label: 'Chưa có phép năm', match: (r) => !r.leave },
]

const updatedAt = (time: number) =>
  new Date(time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

export function MonthlyTimesheetsPage() {
  const currentMonth = todayYmd().slice(0, 7)
  const [month, setMonth] = useState(currentMonth)
  const [tab, setTab] = useState<string>(ALL)
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState(ALL)
  const [extra, setExtra] = useState(ALL)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<{ id: string; focus?: 'overtime' } | null>(null)
  const [showSource, setShowSource] = useState(false)

  const { data: report, isPending, isError, error, refetch, isFetching, dataUpdatedAt } = useFullTimeTimesheets(month)
  const { data: departments = [] } = useDepartments()
  const update = useUpdateFullTimeTimesheet(month)
  const rows = useMemo(() => report?.rows ?? [], [report])

  const filtered = useMemo(() => {
    const q = normalizeSearch(query.trim())
    const extraFilter = EXTRA_FILTERS.find((f) => f.value === extra)
    return rows.filter((row) => {
      const matchesText = !q || normalizeSearch(`${displayName(row.user)} ${row.user.email}`).includes(q)
      const matchesDepartment =
        department === ALL || (department === UNASSIGNED ? !row.department : row.department?.id === department)
      const matchesTab = tab === ALL || row.confirmationStatus === tab
      return matchesText && matchesDepartment && matchesTab && (!extraFilter || extraFilter.match(row))
    })
  }, [rows, query, department, tab, extra])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const selectedRow = selected && rows.find((r) => r.id === selected.id)

  /** Đổi bộ lọc thì quay về trang đầu. */
  function resetPageAfter(change: () => void) {
    change()
    setPage(1)
  }

  function saveCell(row: FullTimeTimesheetRow, field: ManualField, value: number) {
    const name = MANUAL_FIELDS.find((f) => f.field === field)!.short.toLowerCase()
    return update
      .mutateAsync({ id: row.id, input: { [field]: value } })
      .then(() => toast.success(`Đã lưu ${name} của ${displayName(row.user)}: ${formatWorkdays(value)}`))
      .catch((err: unknown) => toast.error(getApiErrorMessage(err)))
  }

  return (
    <PageContainer>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h2 className="text-2xl font-semibold tracking-tight">Chốt công {formatMonth(month).toLowerCase()}</h2>
          {report && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className={isFetching ? 'size-3 animate-spin' : 'size-3'} />
              {report.monthEnded ? 'Tháng đã kết thúc.' : 'Tháng đang chạy, số liệu tự cập nhật theo chấm công.'} Tải lúc{' '}
              {updatedAt(dataUpdatedAt)}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
          <MonthNav month={month} max={currentMonth} onChange={(next) => resetPageAfter(() => setMonth(next))} />
          <Button variant="outline" onClick={() => setShowSource(true)}>
            <Info />
            Nguồn dữ liệu
          </Button>
          {FEATURES.exportData && (
            <Button disabled={filtered.length === 0} onClick={() => downloadMonthlyCsv(month, filtered)}>
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
              {STATUS_TABS.map((status) => (
                <TabsTrigger key={status} value={status} className={TAB_TRIGGER}>
                  {STATUS_LABEL[status]}
                  {report && status !== 'confirmed' && report.summary[status] > 0 && (
                    <Badge
                      variant="secondary"
                      className={
                        status === 'disputed'
                          ? 'h-4 bg-destructive/10 px-1.5 text-destructive tabular-nums'
                          : 'h-4 bg-amber-500/10 px-1.5 text-amber-700 tabular-nums dark:text-amber-400'
                      }
                    >
                      {report.summary[status]}
                    </Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <p className="hidden text-xs text-muted-foreground xl:block">
            Bấm vào ô của nhóm Quản lý nhập để sửa · Xin phép và tăng ca không cộng vào tổng công
          </p>
        </div>

        <div className="flex flex-wrap gap-2 p-3">
          <div className="relative min-w-56 flex-1 sm:max-w-sm">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => resetPageAfter(() => setQuery(e.target.value))}
              placeholder="Tìm tên hoặc email…"
              aria-label="Tìm nhân sự chốt công"
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
          <Select value={extra} onValueChange={(next) => resetPageAfter(() => setExtra(next))}>
            <SelectTrigger aria-label="Lọc bổ sung" className="min-w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tất cả dữ liệu</SelectItem>
              {EXTRA_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
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
                : 'Không có nhân sự phù hợp. Thử đổi từ khoá hoặc bộ lọc.'}
            </p>
          </div>
        ) : (
          <MonthlyTimesheetTable
            rows={pageRows}
            standardWorkdays={report.standardWorkdays}
            onSelect={(id, focus) => setSelected({ id, focus })}
            onSave={saveCell}
          />
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

      {selectedRow && report && (
        <MonthlyDetailSheet
          key={selectedRow.id}
          month={report.month}
          standardWorkdays={report.standardWorkdays}
          row={selectedRow}
          focus={selected?.focus}
          onClose={() => setSelected(null)}
        />
      )}
      {showSource && <MonthlySourceDialog onClose={() => setShowSource(false)} />}
    </PageContainer>
  )
}
