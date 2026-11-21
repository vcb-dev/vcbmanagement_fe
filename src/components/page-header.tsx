import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  description,
  actions,
  hideTitleOnPhone = false,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  /**
   * Điện thoại đã có tên trang ở thanh tiêu đề của app (h1), nên ẩn tiêu đề này khỏi mắt để khỏi lặp;
   * trình đọc màn hình vẫn đọc được. Từ sm trở lên hiện lại như cũ.
   */
  hideTitleOnPhone?: boolean
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h2
          className={cn(
            'text-xl font-semibold break-words text-foreground sm:text-2xl',
            hideTitleOnPhone && 'sr-only sm:not-sr-only',
          )}
        >
          {title}
        </h2>
        {description && <p className="text-sm leading-5 break-words text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
