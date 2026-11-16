import type { ReactNode } from 'react'
import { PaginationBar } from '@/components/pagination-bar'
import { pageCountOf, type Paginated } from '@/lib/pagination'
import { cn } from '@/lib/utils'

/** Dòng cuối bảng: "Hiển thị 21–40 trong 57 nhân sự" + nút trang, cho danh sách BE phân trang. */
export function PaginationFooter({
  data,
  unit,
  onPageChange,
  hint,
  className,
}: {
  data: Paginated<unknown> | undefined
  unit: string
  onPageChange: (page: number) => void
  hint?: ReactNode
  className?: string
}) {
  // Danh sách rỗng đã có thông báo riêng của từng bảng.
  if (!data || data.total === 0) return null
  const from = (data.page - 1) * data.pageSize + 1
  const to = Math.min(data.page * data.pageSize, data.total)

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground',
        className,
      )}
    >
      <span>
        Hiển thị {from}–{to} trong {data.total} {unit}
        {hint && <span className="hidden sm:inline"> · {hint}</span>}
      </span>
      <PaginationBar page={data.page} pageCount={pageCountOf(data)} onChange={onPageChange} />
    </div>
  )
}
