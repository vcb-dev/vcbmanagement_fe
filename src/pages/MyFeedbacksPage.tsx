import { MessageSquare, Plus } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageContainer } from '@/components/page-container'
import { PageHeader } from '@/components/page-header'
import { PaginationBar } from '@/components/pagination-bar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FeedbackDetailPanel } from '@/features/feedbacks/FeedbackDetailPanel'
import { FeedbackFormDialog } from '@/features/feedbacks/FeedbackFormDialog'
import type { FeedbackDetail, FeedbackStatus } from '@/features/feedbacks/feedbacks.types'
import { useFeedbackCounts, useFeedbacks } from '@/features/feedbacks/use-feedbacks'
import { MyFeedbackList } from '@/features/my-feedbacks/MyFeedbackList'
import { FEEDBACK_STATUS_LABEL } from '@/features/part-time/part-time.types'
import { getApiErrorMessage } from '@/lib/api-client'

type StatusTab = 'all' | FeedbackStatus

/**
 * Feedback của tôi: nhân viên xem và trao đổi với quản lý về bản chốt công các tháng, tách khỏi trang Công của tôi.
 * Danh sách bên trái nhóm theo tháng công, bên phải là nội dung và các lần trả lời. `?month=YYYY-MM` mở sẵn feedback của tháng đó.
 */
export function MyFeedbacksPage() {
  const [searchParams] = useSearchParams()
  const focusMonth = searchParams.get('month')
  const [status, setStatus] = useState<StatusTab>('all')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const detailRef = useRef<HTMLDivElement | null>(null)

  const { data: counts } = useFeedbackCounts()
  const { data, isPending, isError, error, refetch } = useFeedbacks({
    status: status === 'all' ? undefined : status,
    page,
  })
  const items = useMemo(() => data?.items ?? [], [data])
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  const activeId =
    selectedId && items.some((i) => i.id === selectedId)
      ? selectedId
      : (items.find((i) => i.sheet.month === focusMonth)?.id ?? items[0]?.id ?? null)

  function changeStatus(next: string) {
    setStatus(next as StatusTab)
    setPage(1)
  }

  function select(id: string) {
    setSelectedId(id)
    // Màn hẹp: chi tiết nằm dưới danh sách, cuộn xuống cho thấy.
    if (window.innerWidth < 1024) detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleCreated(detail: FeedbackDetail) {
    setStatus('all')
    setPage(1)
    setSelectedId(detail.id)
  }

  const noFeedbackYet = counts?.all === 0 && status === 'all' && items.length === 0 && !isPending

  return (
    <PageContainer>
      <PageHeader
        title="Feedback của tôi"
        description="Trao đổi với quản lý về số liệu công các tháng. Quản lý trả lời là feedback được đánh dấu đã xử lý; bạn trả lời lại thì feedback mở lại."
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus />
            Gửi feedback
          </Button>
        }
      />

      {noFeedbackYet ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card/50 px-6 py-14 text-center">
          <MessageSquare className="size-9 text-muted-foreground/50" />
          <p className="text-sm font-medium">Bạn chưa gửi feedback nào</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Khi số liệu công tháng chưa đúng, bấm <b className="font-medium text-foreground">Gửi feedback</b> ở trên hoặc{' '}
            <b className="font-medium text-foreground">Báo sai</b> ở{' '}
            <Link to="/my-timesheet" className="font-medium text-primary hover:underline">
              Công của tôi
            </Link>{' '}
            để quản lý kiểm tra lại.
          </p>
        </div>
      ) : (
        <>
          <Tabs value={status} onValueChange={changeStatus}>
            <TabsList className="h-9">
              <TabsTrigger value="all" className="text-xs">
                Tất cả ({counts?.all ?? 0})
              </TabsTrigger>
              <TabsTrigger value="open" className="text-xs">
                {FEEDBACK_STATUS_LABEL.open} ({counts?.open ?? 0})
              </TabsTrigger>
              <TabsTrigger value="resolved" className="text-xs">
                {FEEDBACK_STATUS_LABEL.resolved} ({counts?.resolved ?? 0})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className="flex min-w-0 flex-col gap-4">
              {isPending ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-28 w-full rounded-xl" />
                  ))}
                </div>
              ) : isError && !data ? (
                <p className="rounded-xl border bg-card px-4 py-10 text-center text-sm text-destructive">
                  {getApiErrorMessage(error)}{' '}
                  <button type="button" className="underline" onClick={() => void refetch()}>
                    Thử lại
                  </button>
                </p>
              ) : items.length === 0 ? (
                <p className="rounded-xl border border-dashed bg-card/50 px-4 py-10 text-center text-sm text-muted-foreground">
                  {status === 'open'
                    ? 'Không có feedback nào đang chờ quản lý trả lời.'
                    : status === 'resolved'
                      ? 'Chưa có feedback nào được xử lý.'
                      : 'Chưa có feedback nào.'}
                </p>
              ) : (
                <MyFeedbackList items={items} selectedId={activeId} onSelect={select} />
              )}
              {pageCount > 1 && (
                <div className="flex justify-center">
                  <PaginationBar page={page} pageCount={pageCount} onChange={setPage} />
                </div>
              )}
            </div>

            <div ref={detailRef} className="min-w-0 scroll-mt-20">
              <FeedbackDetailPanel id={activeId} />
            </div>
          </div>
        </>
      )}

      <FeedbackFormDialog open={formOpen} onOpenChange={setFormOpen} onCreated={handleCreated} />
    </PageContainer>
  )
}
