import { useRef, type ReactNode } from 'react'
import { PaginationBar } from '@/components/pagination-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { getApiErrorMessage } from '@/lib/api-client'
import { LeaveRequestDetailPanel } from './LeaveRequestDetailPanel'
import { LeaveRequestList } from './LeaveRequestList'
import type { LeaveRequestPage } from './leave-requests.types'

/** Hai cột: danh sách đơn (có phân trang) bên trái, chi tiết đơn đang chọn bên phải. Màn hẹp thì xếp chồng. */
export function LeaveRequestBoard({
  data,
  isPending,
  isError,
  error,
  onRetry,
  page,
  onPageChange,
  selectedId,
  onSelect,
  emptyText,
  showUser = false,
}: {
  data: LeaveRequestPage | undefined
  isPending: boolean
  isError: boolean
  error: unknown
  onRetry: () => void
  page: number
  onPageChange: (page: number) => void
  selectedId: string | null
  onSelect: (id: string) => void
  emptyText: ReactNode
  showUser?: boolean
}) {
  const detailRef = useRef<HTMLDivElement | null>(null)
  const items = data?.items ?? []
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const activeId = selectedId && items.some((i) => i.id === selectedId) ? selectedId : (items[0]?.id ?? null)

  function select(id: string) {
    onSelect(id)
    if (window.innerWidth < 1024) detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="flex min-w-0 flex-col gap-4">
        {isPending && !data ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : isError && !data ? (
          <p className="rounded-xl border bg-card px-4 py-10 text-center text-sm text-destructive">
            {getApiErrorMessage(error)}{' '}
            <button type="button" className="underline" onClick={onRetry}>
              Thử lại
            </button>
          </p>
        ) : items.length === 0 ? (
          <p className="rounded-xl border border-dashed bg-card/50 px-4 py-10 text-center text-sm text-muted-foreground">
            {emptyText}
          </p>
        ) : (
          <LeaveRequestList items={items} selectedId={activeId} onSelect={select} showUser={showUser} />
        )}
        {pageCount > 1 && (
          <div className="flex justify-center">
            <PaginationBar page={page} pageCount={pageCount} onChange={onPageChange} />
          </div>
        )}
      </div>
      <div ref={detailRef} className="min-w-0 scroll-mt-20">
        <LeaveRequestDetailPanel id={activeId} showUser={showUser} />
      </div>
    </div>
  )
}
