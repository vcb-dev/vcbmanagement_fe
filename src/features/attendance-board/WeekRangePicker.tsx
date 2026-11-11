import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatMonth } from '@/lib/format'
import { WHOLE_MONTH, rangeLabel, type WeekRange } from './attendance-board.types'

/** Chọn một tuần (thứ Hai – Chủ nhật, cắt theo tháng) hoặc cả tháng, kèm nút lùi / tiến từng tuần. */
export function WeekRangePicker({
  month,
  weeks,
  value,
  onChange,
}: {
  month: string
  weeks: WeekRange[]
  value: string
  onChange: (next: string) => void
}) {
  const index = value === WHOLE_MONTH ? -1 : Number(value)
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon-sm"
        disabled={index <= 0}
        onClick={() => onChange(String(index - 1))}
        aria-label="Tuần trước"
      >
        <ChevronLeft />
      </Button>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label="Khoảng ngày" className="min-w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {weeks.map((w) => (
            <SelectItem key={w.index} value={String(w.index)}>
              Tuần {w.index + 1} · {rangeLabel(w.days)}
            </SelectItem>
          ))}
          <SelectItem value={WHOLE_MONTH}>Cả {formatMonth(month).toLowerCase()}</SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="icon-sm"
        disabled={index === -1 || index >= weeks.length - 1}
        onClick={() => onChange(String(index + 1))}
        aria-label="Tuần sau"
      >
        <ChevronRight />
      </Button>
    </div>
  )
}
