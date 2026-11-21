import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatMonth, shiftMonth } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Nút chuyển tháng; trên màn cảm ứng nút to hơn cho dễ bấm. */
const NAV_BUTTON = 'pointer-coarse:size-10'

export function MonthNav({
  month,
  max,
  onChange,
  className,
}: {
  month: string
  max: string
  onChange: (m: string) => void
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button variant="outline" size="icon-sm" className={NAV_BUTTON} onClick={() => onChange(shiftMonth(month, -1))} aria-label="Tháng trước">
        <ChevronLeft />
      </Button>
      <span className="min-w-28 text-center text-sm font-medium tabular-nums" aria-live="polite">
        {formatMonth(month)}
      </span>
      <Button
        variant="outline"
        size="icon-sm"
        className={NAV_BUTTON}
        onClick={() => onChange(shiftMonth(month, 1))}
        disabled={month >= max}
        aria-label="Tháng sau"
      >
        <ChevronRight />
      </Button>
    </div>
  )
}
