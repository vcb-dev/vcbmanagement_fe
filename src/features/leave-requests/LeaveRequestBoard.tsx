import { useEffect, useRef, useState, type ReactNode } from 'react'
import { PaginationBar } from '@/components/pagination-bar'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { useMediaQuery } from '@/hooks/use-media-query'
import { getApiErrorMessage } from '@/lib/api-client'
import { keepKeyboardClosedOnTouch } from '@/lib/touch'
import { LeaveRequestDetailPanel } from './LeaveRequestDetailPanel'
import { LeaveRequestList } from './LeaveRequestList'
import type { LeaveRequestPage } from './leave-requests.types'

/**
 * Màn rộng: hai cột, danh sách đơn (có phân trang) bên trái, chi tiết đơn đang chọn bên phải (mặc định đơn đầu tiên).
 * Cột chi tiết dính ngay dưới thanh đầu trang khi cuộn, nên bấm đơn ở cuối danh sách dài vẫn thấy chi tiết tại chỗ.
 * Màn hẹp (điện thoại, máy tính bảng dọc): chỉ có danh sách, bấm một đơn thì chi tiết mở trong sheet phủ màn hình,
 * đóng sheet là về đúng chỗ đang xem trong danh sách. `selectedId` có sẵn (vd `?id=` trên URL) thì mở sheet ngay.
 * Trong sheet, duyệt / từ chối / rút đơn xong thì sheet tự đóng, về danh sách để mở đơn kế tiếp.
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
  hideStatus = false,
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
  /** Đang lọc một trạng thái: điện thoại ẩn nhãn trạng thái trên thẻ. */
  hideStatus?: boolean
}) {
  const wide = useMediaQuery('(min-width: 1024px)')
  const items = data?.items ?? []
  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1
  const activeId = selectedId && items.some((i) => i.id === selectedId) ? selectedId : (items[0]?.id ?? null)

  // Giữ đơn vừa xem trong sheet lúc sheet đang trượt ra, để nội dung không biến mất giữa chừng.
  const [sheetId, setSheetId] = useState(selectedId)
  if (selectedId !== null && selectedId !== sheetId) setSheetId(selectedId)

  // Đổi đơn thì cột chi tiết (cuộn riêng khi dài hơn màn hình) về đầu, để thấy tên và thông tin đơn mới.
  const detailRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (detailRef.current) detailRef.current.scrollTop = 0
  }, [activeId])

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
          <LeaveRequestList
            items={items}
            selectedId={wide ? activeId : selectedId}
            onSelect={onSelect}
            showUser={showUser}
            hideStatus={hideStatus}
          />
        )}
        {pageCount > 1 && (
          <div className="flex justify-center">
            <PaginationBar page={page} pageCount={pageCount} onChange={onPageChange} />
          </div>
        )}
      </div>
      {wide ? (
        // top 4.5rem = thanh đầu trang 3.5rem + 1rem cách; chi tiết dài hơn màn hình thì cuộn riêng trong cột.
        <div
          ref={detailRef}
          className="sticky top-[4.5rem] max-h-[calc(100dvh-5.5rem)] min-w-0 self-start overflow-y-auto rounded-xl"
        >
          <LeaveRequestDetailPanel id={activeId} showUser={showUser} />
        </div>
      ) : (
        <Sheet open={selectedId !== null} onOpenChange={(open) => !open && onSelect(null)}>
          <SheetContent
            className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
            onOpenAutoFocus={keepKeyboardClosedOnTouch}
          >
            <SheetTitle className="sr-only">Chi tiết đơn xin phép</SheetTitle>
            <SheetDescription className="sr-only">Thông tin đơn, phép năm và chấm công liên quan, thao tác với đơn.</SheetDescription>
            {/* Khung cuộn không đệm: panel tự đệm để thanh nút dưới cùng dính sát đáy sheet. */}
            <div className="flex flex-1 flex-col overflow-y-auto overscroll-contain">
              {sheetId && (
                <LeaveRequestDetailPanel id={sheetId} showUser={showUser} variant="sheet" onDone={() => onSelect(null)} />
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
