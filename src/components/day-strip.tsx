import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLayoutEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { formatDayMonth, weekdayShort } from '@/lib/format'
import { NO_SCROLLBAR } from '@/lib/scroll'
import { cn } from '@/lib/utils'

/**
 * Dải chọn một ngày cho màn điện thoại: mỗi ngày một ô (thứ ở trên, ngày ở dưới), ngày đang chọn tô màu chính, hôm nay chữ màu chính.
 * Tới 7 ngày thì các ô chia đều hàng; nhiều hơn (cả tháng) thì vuốt ngang và ngày đang chọn tự cuộn vào giữa.
 * `marked`: ngày có chấm nhỏ bên dưới (vd có người tăng ca). `onPrev` / `onNext`: nút lùi / tiến ở hai đầu (vd đổi tuần),
 * truyền `undefined` để khoá nút.
 */
export function DayStrip({
  days,
  value,
  today,
  onChange,
  disableFuture = false,
  marked,
  onPrev,
  onNext,
  prevLabel = 'Tuần trước',
  nextLabel = 'Tuần sau',
  showArrows = false,
  className,
}: {
  days: string[]
  value: string
  today: string
  onChange: (ymd: string) => void
  /** Khoá các ngày sau hôm nay (chưa có dữ liệu). */
  disableFuture?: boolean
  marked?: ReadonlySet<string>
  onPrev?: () => void
  onNext?: () => void
  prevLabel?: string
  nextLabel?: string
  /** Hiện hai nút lùi / tiến, kể cả khi đang bị khoá, để dải không xê dịch khi tới đầu / cuối. */
  showArrows?: boolean
  className?: string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrolls = days.length > 7

  // Cuộn ngang trong dải (không dùng scrollIntoView để trang không bị kéo theo chiều dọc).
  useLayoutEffect(() => {
    const box = scrollRef.current
    const chip = box?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!box || !chip || !scrolls) return
    box.scrollLeft = Math.max(0, chip.offsetLeft - (box.clientWidth - chip.offsetWidth) / 2)
  }, [value, scrolls, days.length])

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {showArrows && (
        <Button variant="ghost" size="icon-sm" className="h-12 w-7 shrink-0" disabled={!onPrev} onClick={onPrev} aria-label={prevLabel}>
          <ChevronLeft />
        </Button>
      )}
      <div
        ref={scrollRef}
        role="group"
        aria-label="Chọn ngày"
        className={cn('flex min-w-0 flex-1 gap-1', scrolls && cn('overflow-x-auto scroll-smooth', NO_SCROLLBAR))}
      >
        {days.map((ymd) => {
          const active = ymd === value
          const isToday = ymd === today
          return (
            <button
              key={ymd}
              type="button"
              aria-pressed={active}
              aria-label={`${weekdayShort(ymd)} ${formatDayMonth(ymd)}${isToday ? ', hôm nay' : ''}`}
              disabled={disableFuture && ymd > today}
              onClick={() => onChange(ymd)}
              className={cn(
                'relative flex h-12 flex-col items-center justify-center rounded-lg text-center transition-colors outline-none',
                'focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-35',
                scrolls ? 'w-11 flex-none' : 'min-w-0 flex-1',
                active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                !active && isToday && 'text-primary',
              )}
            >
              <span className={cn('text-[11px] leading-4', !active && !isToday && 'text-muted-foreground')}>
                {weekdayShort(ymd)}
              </span>
              <span className="text-sm leading-5 font-semibold tabular-nums">{ymd.slice(8)}</span>
              {marked?.has(ymd) && (
                <i className={cn('absolute bottom-1 size-1 rounded-full', active ? 'bg-primary-foreground' : 'bg-primary')} />
              )}
            </button>
          )
        })}
      </div>
      {showArrows && (
        <Button variant="ghost" size="icon-sm" className="h-12 w-7 shrink-0" disabled={!onNext} onClick={onNext} aria-label={nextLabel}>
          <ChevronRight />
        </Button>
      )}
    </div>
  )
}
