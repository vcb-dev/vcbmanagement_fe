import { Download, Info, Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
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
import { useMe } from '@/features/auth/use-auth'
import { useDepartments } from '@/features/departments/use-departments'
import { downloadLateCsv } from '@/features/late/late-export'
import { lateColumns, type LateReport, type LateReportRow } from '@/features/late/late.types'
import { LateDetailSheet } from '@/features/late/LateDetailSheet'
import { LateReportTable } from '@/features/late/LateReportTable'
import { LateRuleLine } from '@/features/late/LateRuleLine'
import { LateSourceDialog } from '@/features/late/LateSourceDialog'
import { useLateReport } from '@/features/late/use-late-report'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatHoursMinutes, formatMonth, normalizeSearch, todayYmd } from '@/lib/format'
import { LATE_SEVERITIES, LATE_SEVERITY_LABEL, lateSeverity, lateSeverityDot, type LateSeverity } from '@/lib/late-levels'
import { displayName } from '@/lib/user-display'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 15
/** Radix Select không nhận giá trị rỗng. */
const ALL = 'all'
const UNASSIGNED = 'unassigned'
const HAS_LATE = 'has-late'
const TAB_TRIGGER =
  'h-8 flex-none px-2 after:bg-primary data-active:text-primary data-active:hover:text-primary dark:data-active:text-primary'

const SEVERITY_HINT: Record<LateSeverity, string> = {
  low: 'Người có ít nhất một lần muộn thuộc mốc thấp nhất trong bộ mốc của họ',
  mid: 'Người có ít nhất một lần muộn thuộc các mốc ở giữa trong bộ mốc của họ',
  high: 'Người có ít nhất một lần muộn thuộc mốc cao nhất trong bộ mốc của họ',
}

function severitiesOf(row: LateReportRow): LateSeverity[] {
  return row.levels.map((l) => lateSeverity(l.level, row.thresholds))
}

function matchesTab(row: LateReportRow, tab: string): boolean {
  if (tab === ALL) return true
  if (tab === HAS_LATE) return row.lateCount > 0
  return row.levels.some((l) => l.count > 0 && lateSeverity(l.level, row.thresholds) === tab)
}

function Kpis({ report }: { report: LateReport }) {
  const { totalPeople, latePeople, lateCount, lateMinutes } = report.summary
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
      <span>
        <b className="font-semibold text-amber-600 tabular-nums dark:text-amber-400">{latePeople}</b> /{' '}
        <b className="font-semibold text-foreground tabular-nums">{totalPeople}</b> người có đi muộn
      </span>
      <i className="h-3.5 w-px bg-border" />
      <span>
        <b className="font-semibold text-foreground tabular-nums">{lateCount}</b> lần
      </span>
      <i className="h-3.5 w-px bg-border" />
      <span>
        <b className="font-semibold text-foreground tabular-nums">{formatHoursMinutes(lateMinutes)}</b> tổng thời gian
      </span>
    </p>
  )
}

export function LatePage() {
  const { data: me } = useMe()
  const today = todayYmd()
  const currentMonth = today.slice(0, 7)
  const [month, setMonth] = useState(currentMonth)
  const [tab, setTab] = useState(HAS_LATE)
  const [query, setQuery] = useState('')
  const [department, setDepartment] = useState(ALL)
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showSource, setShowSource] = useState(false)

  const { data: report, isPending, isError, error, refetch } = useLateReport(month)
  const { data: departments = [] } = useDepartments()
  const rows = useMemo(() => report?.rows ?? [], [report])

  const severityTabs = useMemo(() => {
    const present = new Set(rows.flatMap(severitiesOf))
    return LATE_SEVERITIES.filter((s) => present.has(s))
  }, [rows])
  /** Tháng khác có thể không có mức đang chọn, khi đó quay về tab mặc định. */
  const activeTab = tab === ALL || severityTabs.some((s) => s === tab) ? tab : HAS_LATE

  const filtered = useMemo(() => {
    const q = normalizeSearch(query.trim())
    return rows.filter((row) => {
      const matchesText = !q || normalizeSearch(`${displayName(row.user)} ${row.user.email}`).includes(q)
      const matchesDepartment =
        department === ALL || (department === UNASSIGNED ? !row.department : row.department?.id === department)
      return matchesText && matchesDepartment && matchesTab(row, activeTab)
    })
  }, [rows, query, department, activeTab])

  const columns = useMemo(() => lateColumns(filtered), [filtered])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const selected = rows.find((r) => r.user.id === selectedId)
  const noLateInMonth = report?.summary.latePeople === 0 && activeTab !== ALL

  /** Đổi bộ lọc thì quay về trang đầu. */
  function resetPageAfter(change: () => void) {
    change()
    setPage(1)
  }

  return (
    <PageContainer>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h2 className="text-2xl font-semibold tracking-tight">Đi muộn {formatMonth(month).toLowerCase()}</h2>
          {report ? <Kpis report={report} /> : <Skeleton className="h-5 w-96 max-w-full" />}
          {report && <LateRuleLine rules={report.rules} canConfigure={me?.role === 'admin'} />}
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
          <MonthNav month={month} max={currentMonth} onChange={(next) => resetPageAfter(() => setMonth(next))} />
          <Button variant="outline" disabled={!report} onClick={() => setShowSource(true)}>
            <Info />
            Nguồn dữ liệu
          </Button>
          <Button disabled={filtered.length === 0} onClick={() => downloadLateCsv(month, filtered)}>
            <Download />
            Xuất dữ liệu
          </Button>
        </div>
      </div>

      <Card className="gap-0 py-0">
        <Tabs value={activeTab} onValueChange={(next) => resetPageAfter(() => setTab(next))} className="border-b px-3 pt-2 pb-[5px]">
          <TabsList variant="line" className="flex-wrap justify-start gap-y-1.5 group-data-horizontal/tabs:h-auto">
            <TabsTrigger value={ALL} className={TAB_TRIGGER}>
              Tất cả
            </TabsTrigger>
            <TabsTrigger value={HAS_LATE} className={TAB_TRIGGER}>
              Có đi muộn
              {report && (
                <Badge variant="secondary" className="h-4 bg-amber-500/10 px-1.5 text-amber-700 tabular-nums dark:text-amber-400">
                  {report.summary.latePeople}
                </Badge>
              )}
            </TabsTrigger>
            {severityTabs.map((severity) => (
              <TabsTrigger key={severity} value={severity} title={SEVERITY_HINT[severity]} className={TAB_TRIGGER}>
                <i className={cn('size-2 rounded-full', lateSeverityDot(severity))} />
                {LATE_SEVERITY_LABEL[severity]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap gap-2 p-3">
          <div className="relative min-w-56 flex-1 sm:max-w-sm">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => resetPageAfter(() => setQuery(e.target.value))}
              placeholder="Tìm tên hoặc email…"
              aria-label="Tìm nhân sự đi muộn"
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
        ) : isError ? (
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
              {noLateInMonth ? 'Chưa có ai đi muộn trong tháng này.' : 'Không có nhân sự phù hợp. Thử đổi từ khoá hoặc bộ lọc.'}
            </p>
          </div>
        ) : (
          <LateReportTable
            month={report.month}
            rows={pageRows}
            columns={columns}
            today={today}
            onSelect={setSelectedId}
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

      {selected && report && <LateDetailSheet month={report.month} row={selected} onClose={() => setSelectedId(null)} />}
      {showSource && report && <LateSourceDialog report={report} onClose={() => setShowSource(false)} />}
    </PageContainer>
  )
}
