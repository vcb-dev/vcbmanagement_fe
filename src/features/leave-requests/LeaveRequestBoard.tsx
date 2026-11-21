import { useState, type ReactNode } from 'react'
import { PaginationBar } from '@/components/pagination-bar'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useMediaQuery } from '@/hooks/use-media-query'
import { getApiErrorMessage } from '@/lib/api-client'
import { LeaveRequestDetailPanel } from './LeaveRequestDetailPanel'
import { LeaveRequestList } from './LeaveRequestList'
import type { LeaveRequestPage } from './leave-requests.types'

/**
 * Màn rộng: hai cột, danh sách đơn (có phân trang) bên trái, chi tiết đơn đang chọn bên phải (mặc định đơn đầu tiên).
 * Màn hẹp (điện thoại, máy tính bảng dọc): chỉ có danh sách, bấm một đơn thì chi tiết mở trong sheet phủ màn hình,
 * đóng sheet là về đúng chỗ đang xem trong danh sách. `selectedId` có sẵn (vd `?id=` trên URL) thì mở sheet ngay.
 */
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
  /** `null` khi đóng sheet chi tiết ở màn hẹp. */
  onSelect: (id: string | null) => void
  emptyText: ReactNode
  showUser?: boolean
}) {
  const wide = useMediaQuery('(min-width: 1024px)')
  const items = data?.items ?? []
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const activeId = selectedId && items.some((i) => i.id === selectedId) ? selectedId : (items[0]?.id ?? null)

  // Giữ đơn vừa xem trong sheet lúc sheet đang trượt ra, để nội dung không biến mất giữa chừng.
  const [sheetId, setSheetId] = useState(selectedId)
  if (selectedId !== null && selectedId !== sheetId) setSheetId(selectedId)

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
          <LeaveRequestList items={items} selectedId={wide ? activeId : selectedId} onSelect={onSelect} showUser={showUser} />
        )}
        {pageCount > 1 && (
          <div className="flex justify-center">
            <PaginationBar page={page} pageCount={pageCount} onChange={onPageChange} />
          </div>
        )}
      </div>
      {wide ? (
        <div className="min-w-0">
          <LeaveRequestDetailPanel id={activeId} showUser={showUser} />
        </div>
      ) : (
        <Sheet open={selectedId !== null} onOpenChange={(open) => !open && onSelect(null)}>
          <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
            <SheetTitle className="sr-only">Chi tiết đơn xin phép</SheetTitle>
            <SheetDescription className="sr-only">Thông tin đơn, phép năm và chấm công liên quan, thao tác với đơn.</SheetDescription>
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              {sheetId && <LeaveRequestDetailPanel id={sheetId} showUser={showUser} variant="sheet" />}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
