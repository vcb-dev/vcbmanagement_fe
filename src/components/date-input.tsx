import { CalendarDays } from 'lucide-react'
import type { MouseEvent } from 'react'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Máy có chuột: bấm chỗ nào trên ô cũng mở lịch (Chrome chỉ mở khi bấm đúng biểu tượng lịch). */
function openPicker(e: MouseEvent<HTMLInputElement>) {
  if (!window.matchMedia('(pointer: fine)').matches) return
  try {
    e.currentTarget.showPicker()
  } catch {
    // Trình duyệt cũ chưa có showPicker: vẫn gõ ngày bằng bàn phím được.
  }
}

/**
 * Ô chọn một ngày, luôn hiện dạng ngắn "20/11/2026" giống nhau ở mọi trình duyệt.
 * Không để trình duyệt tự vẽ ngày: Safari trên iPhone hiện "ngày 20 thg 11, 2026", dài quá ô nên chữ bị xuống dòng và cắt mất.
 * Ô `type="date"` gốc vẫn phủ kín bên trên (trong suốt), nên bấm vào là mở bộ chọn ngày của máy.
 */
export function DateInput({
  value,
  onChange,
  min,
  max,
  className,
  'aria-label': ariaLabel,
}: {
  /** "YYYY-MM-DD" */
  value: string
  onChange: (ymd: string) => void
  min?: string
  max?: string
  className?: string
  'aria-label': string
}) {
  return (
    <div
      className={cn(
        'relative inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-input bg-transparent px-2.5 text-sm whitespace-nowrap tabular-nums transition-colors',
        'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30',
        className,
      )}
    >
      <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span aria-hidden>{value ? formatDate(value) : 'dd/mm/yyyy'}</span>
      {/* Chữ 16px để iPhone không tự phóng to trang khi chạm vào ô. */}
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        onClick={openPicker}
        className="absolute inset-0 block size-full cursor-pointer appearance-none text-base opacity-0"
      />
    </div>
  )
}
