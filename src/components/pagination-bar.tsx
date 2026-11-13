import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Fragment } from 'react'
import { Button } from '@/components/ui/button'

/** Luôn hiện trang đầu, trang cuối và hai trang kề trang hiện tại. */
function visiblePages(page: number, pageCount: number): number[] {
  const pages = new Set([1, page - 1, page, page + 1, pageCount])
  return [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b)
}

export function PaginationBar({
  page,
  pageCount,
  onChange,
}: {
  page: number
  pageCount: number
  onChange: (page: number) => void
}) {
  if (pageCount <= 1) return null
  const pages = visiblePages(page, pageCount)
  return (
    <nav aria-label="Phân trang" className="flex items-center gap-1">
      <Button variant="ghost" size="icon-sm" disabled={page === 1} onClick={() => onChange(page - 1)} aria-label="Trang trước">
        <ChevronLeft />
      </Button>
      {pages.map((p, i) => (
        <Fragment key={p}>
          {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-muted-foreground">…</span>}
          <Button
            variant={p === page ? 'secondary' : 'ghost'}
            size="icon-sm"
            aria-current={p === page ? 'page' : undefined}
            className="tabular-nums"
            onClick={() => onChange(p)}
          >
            {p}
          </Button>
        </Fragment>
      ))}
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={page === pageCount}
        onClick={() => onChange(page + 1)}
        aria-label="Trang sau"
      >
        <ChevronRight />
      </Button>
    </nav>
  )
}
