import { useState, useEffect, useRef, useMemo } from 'react'
import {
  CheckCircle2,
  Clock,
  MessageSquare,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react'
import { PageContainer } from '@/components/page-container'
import { PageHeader } from '@/components/page-header'
import { PaginationBar } from '@/components/pagination-bar'
import { StatCard } from '@/components/stat-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useMe } from '@/features/auth/use-auth'
import { FeedbackDetailPanel } from '@/features/feedbacks/FeedbackDetailPanel'
import { FeedbackListPanel } from '@/features/feedbacks/FeedbackListPanel'
import type {
  FeedbackStatus,
  SheetType,
} from '@/features/feedbacks/feedbacks.types'
import {
  useFeedbackCounts,
  useFeedbacks,
} from '@/features/feedbacks/use-feedbacks'

export function FeedbacksPage() {
  const { data: me } = useMe()
  const isStaff = me?.role === 'staff'

  // Filters state
  const [statusTab, setStatusTab] = useState<'all' | FeedbackStatus>('all')
  const [sheetType, setSheetType] = useState<'all' | SheetType>('all')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const detailRef = useRef<HTMLDivElement | null>(null)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const handleStatusChange = (val: string) => {
    setStatusTab(val as 'all' | FeedbackStatus)
    setPage(1)
  }

  const handleSheetTypeChange = (val: string) => {
    setSheetType(val as 'all' | SheetType)
    setPage(1)
  }

  // Data fetching
  const { data: counts, isLoading: countsLoading } = useFeedbackCounts()
  const { data, isLoading } = useFeedbacks({
    status: statusTab === 'all' ? undefined : statusTab,
    sheetType: sheetType === 'all' ? undefined : sheetType,
    q: debouncedSearch || undefined,
    page,
  })

  const items = useMemo(() => data?.items ?? [], [data?.items])
  const total = data?.total ?? 0
  const pageSize = data?.pageSize ?? 30
  const pageCount = Math.ceil(total / pageSize)

  const activeSelectedId =
    selectedId && items.some((i) => i.id === selectedId)
      ? selectedId
      : (items[0]?.id ?? null)

  const handleSelect = (id: string) => {
    setSelectedId(id)
    // On small screens, scroll to detail panel
    if (window.innerWidth < 1024 && detailRef.current) {
      detailRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleDeleted = () => {
    setSelectedId(null)
  }

  return (
    <PageContainer>
      <PageHeader
        title="Feedback"
        description="Mỗi feedback gắn với một bản chốt công tháng (toàn thời gian hoặc part-time). Mỗi câu trả lời ghi lại trạng thái sau khi trả lời, nên biết ai đổi trạng thái và lúc nào."
        actions={
          <Button disabled className="gap-1.5 shadow-xs">
            <Plus className="size-4" />
            {isStaff ? 'Gửi feedback' : 'Ghi nhận feedback'}
          </Button>
        }
      />

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={MessageSquare}
          label="Tổng feedback"
          value={counts?.all ?? 0}
          tone="indigo"
          loading={countsLoading}
        />
        <StatCard
          icon={Clock}
          label="Mới"
          value={counts?.open ?? 0}
          hint="Chưa ai trả lời"
          tone="amber"
          loading={countsLoading}
        />
        <StatCard
          icon={RefreshCw}
          label="Đang xử lý"
          value={counts?.in_progress ?? 0}
          hint="Đã trả lời, chờ hoàn tất"
          tone="sky"
          loading={countsLoading}
        />
        <StatCard
          icon={CheckCircle2}
          label="Đã xử lý"
          value={counts?.resolved ?? 0}
          hint="Đã đóng"
          tone="emerald"
          loading={countsLoading}
        />
      </div>

      {/* Filters & Search Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={statusTab} onValueChange={handleStatusChange} className="w-auto">
          <TabsList className="h-9">
            <TabsTrigger value="all" className="text-xs">
              Tất cả ({counts?.all ?? 0})
            </TabsTrigger>
            <TabsTrigger value="open" className="text-xs">
              Mới ({counts?.open ?? 0})
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="text-xs">
              Đang xử lý ({counts?.in_progress ?? 0})
            </TabsTrigger>
            <TabsTrigger value="resolved" className="text-xs">
              Đã xử lý ({counts?.resolved ?? 0})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative min-w-[200px] flex-1 sm:w-64 sm:flex-initial">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo người gửi hoặc nội dung…"
              className="h-9 pl-8 text-xs"
            />
          </div>

          {/* Sheet type select */}
          <Select value={sheetType} onValueChange={handleSheetTypeChange}>
            <SelectTrigger className="h-9 w-48 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả bản chốt công</SelectItem>
              <SelectItem value="full_time">Chốt công toàn thời gian</SelectItem>
              <SelectItem value="part_time">Chốt công part-time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 2-Column Board */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {/* Left Column: List + Pagination */}
        <div className="flex flex-col gap-4">
          <FeedbackListPanel
            items={items}
            selectedId={activeSelectedId}
            onSelect={handleSelect}
            isLoading={isLoading}
          />
          {pageCount > 1 && (
            <div className="flex justify-center pt-2">
              <PaginationBar page={page} pageCount={pageCount} onChange={setPage} />
            </div>
          )}
        </div>

        {/* Right Column: Detail Panel */}
        <div ref={detailRef} className="scroll-mt-6">
          <FeedbackDetailPanel id={activeSelectedId} onDeleted={handleDeleted} />
        </div>
      </div>
    </PageContainer>
  )
}
