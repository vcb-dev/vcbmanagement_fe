import { useRef, useState, type KeyboardEvent } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const formatNumber = (value: number, digits: number) => value.toLocaleString('vi-VN', { maximumFractionDigits: digits })

/**
 * Ô số sửa ngay trên bảng. Rời ô hoặc Enter thì lưu; Enter, ↑, ↓ chuyển sang ô cùng `navKey` ở dòng khác; Esc huỷ.
 * Khi đang gõ, giá trị trong ô không bị lượt tự tải lại của bảng ghi đè.
 */
export function NumberCell({
  value,
  navKey,
  label,
  parse,
  invalidMessage,
  disabledHint,
  blankZero,
  fractionDigits = 2,
  onSave,
  className,
}: {
  value: number
  /** Các ô cùng cột có cùng khoá, để di chuyển lên xuống bằng bàn phím. */
  navKey: string
  /** Dùng cho trình đọc màn hình, vd "Từ xa của Nguyễn Văn A". */
  label: string
  /** Chuỗi người dùng gõ → số, hoặc null khi không hợp lệ. */
  parse: (raw: string) => number | null
  invalidMessage: string
  /** Có giá trị thì ô bị khoá, hiện lý do khi rê chuột. */
  disabledHint?: string
  /** Hiện ô trống thay cho số 0, cho bảng nhiều ô như bảng theo ngày. */
  blankZero?: boolean
  /** Số chữ số thập phân hiển thị; phải đủ để bấm vào rồi bấm ra không làm tròn mất giá trị. */
  fractionDigits?: number
  onSave: (value: number) => Promise<unknown>
  className?: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const cancelled = useRef(false)
  const shown = draft ?? (blankZero && value === 0 ? '' : formatNumber(value, fractionDigits))

  function commit() {
    const text = draft
    setDraft(null)
    if (text === null || cancelled.current) {
      cancelled.current = false
      return
    }
    const next = parse(text)
    if (next === null) {
      toast.error(invalidMessage)
      return
    }
    if (next === value) return
    setSaving(true)
    onSave(next).finally(() => setSaving(false))
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      cancelled.current = true
      e.currentTarget.blur()
      return
    }
    if (e.key !== 'Enter' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const cells = [
      ...(e.currentTarget.closest('table')?.querySelectorAll<HTMLInputElement>(`input[data-nav="${navKey}"]:not(:disabled)`) ?? []),
    ]
    const next = cells[cells.indexOf(e.currentTarget) + (e.key === 'ArrowUp' ? -1 : 1)]
    if (next) next.focus()
    else e.currentTarget.blur()
  }

  return (
    <input
      data-nav={navKey}
      value={disabledHint ? '—' : shown}
      disabled={!!disabledHint || saving}
      title={disabledHint}
      aria-label={label}
      inputMode="decimal"
      autoComplete="off"
      onFocus={(e) => {
        setDraft(blankZero && value === 0 ? '' : formatNumber(value, fractionDigits))
        e.currentTarget.select()
      }}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={onKeyDown}
      className={cn(
        'h-8 w-14 rounded-md border border-transparent bg-transparent px-2 text-right text-sm tabular-nums transition-colors outline-none',
        'hover:border-input hover:bg-background dark:hover:bg-input/30',
        'focus:border-ring focus:bg-background focus:ring-3 focus:ring-ring/30 dark:focus:bg-input/30',
        'disabled:cursor-not-allowed disabled:text-muted-foreground',
        saving && 'opacity-60',
        value === 0 && draft === null && 'text-muted-foreground',
        className,
      )}
    />
  )
}
