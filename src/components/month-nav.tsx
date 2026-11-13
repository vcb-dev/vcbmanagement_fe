import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatMonth, shiftMonth } from '@/lib/format'

export function MonthNav({ month, max, onChange }: { month: string; max: string; onChange: (m: string) => void }) {
  return (
    <div className="flex items-center gap-1">
      <Button variant="outline" size="icon-sm" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Tháng trước">
        <ChevronLeft />
      </Button>
      <span className="min-w-28 text-center text-sm font-medium">{formatMonth(month)}</span>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => onChange(shiftMonth(month, 1))}
        disabled={month >= max}
        aria-label="Tháng sau"
      >
        <ChevronRight />
      </Button>
    </div>
  )
}
