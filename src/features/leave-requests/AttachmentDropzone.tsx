import { FileText, Upload, X } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { MAX_ATTACHMENTS, MAX_ATTACHMENT_MB, fileSizeLabel } from './leave-request-format'

const ACCEPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const ACCEPT_EXT = /\.(jpe?g|png|webp|pdf)$/i
const MAX_BYTES = MAX_ATTACHMENT_MB * 1024 * 1024
const PASTE_KEY = typeof navigator !== 'undefined' && /Mac|iP(hone|ad|od)/.test(navigator.userAgent) ? '⌘V' : 'Ctrl+V'

/** Một số ứng dụng kéo file sang không kèm mimetype, khi đó xét theo đuôi file. */
const isAccepted = (f: File) => (f.type ? ACCEPT_TYPES.includes(f.type) : ACCEPT_EXT.test(f.name))

const hasFiles = (dt: DataTransfer | null) => !!dt && Array.from(dt.types).includes('Files')

/** Ảnh chụp màn hình dán vào thường tên "image.png" giống nhau: đặt lại theo giờ dán cho dễ phân biệt. */
function renamePasted(files: File[]): File[] {
  const now = new Date()
  const stamp = [now.getHours(), now.getMinutes(), now.getSeconds()].map((n) => String(n).padStart(2, '0')).join('-')
  return files.map((f, i) => {
    if (f.name && !/^image\.\w+$/i.test(f.name)) return f
    const ext = f.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png'
    return new File([f], `Ảnh dán ${stamp}${i > 0 ? `-${i + 1}` : ''}.${ext}`, { type: f.type })
  })
}

/** File trong clipboard: ưu tiên `files`, trình duyệt cũ chỉ có qua `items`. */
function clipboardFiles(dt: DataTransfer): File[] {
  if (dt.files.length) return Array.from(dt.files)
  return Array.from(dt.items)
    .filter((item) => item.kind === 'file')
    .map((item) => item.getAsFile())
    .filter((f): f is File => !!f)
}

function isTextField(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false
  if (el.isContentEditable || el instanceof HTMLTextAreaElement) return true
  return el instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit', 'file'].includes(el.type)
}

/** Gán link xem trước thẳng vào thẻ img và thu hồi khi bỏ file, để không giữ ảnh trong bộ nhớ. */
function ImageThumb({ file }: { file: File }) {
  const img = useRef<HTMLImageElement>(null)
  useEffect(() => {
    const url = URL.createObjectURL(file)
    if (img.current) img.current.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])
  return <img ref={img} alt="" className="size-9 shrink-0 rounded bg-muted object-cover" />
}

/**
 * Đính kèm file xác nhận: bấm để chọn, dán (Ctrl/⌘+V) ở bất kỳ đâu trong form, hoặc kéo thả vào cửa sổ.
 * Chỉ lắng nghe khi đang hiện (form đang mở). Dán vào ô chữ mà clipboard có chữ thì để ô chữ nhận như thường.
 */
export function AttachmentDropzone({
  files,
  onChange,
  onError,
  disabled,
}: {
  files: File[]
  onChange: (files: File[]) => void
  /** Báo lỗi bằng tiếng Việt; null khi lần thêm gần nhất hợp lệ. */
  onError: (message: string | null) => void
  disabled?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const full = files.length >= MAX_ATTACHMENTS

  function add(incoming: File[]) {
    if (disabled || incoming.length === 0) return
    const wrongType = incoming.find((f) => !isAccepted(f))
    const tooBig = incoming.find((f) => isAccepted(f) && f.size > MAX_BYTES)
    const valid = incoming.filter((f) => isAccepted(f) && f.size <= MAX_BYTES)
    const room = MAX_ATTACHMENTS - files.length
    if (wrongType) onError(`"${wrongType.name}" không phải ảnh JPEG / PNG / WebP hoặc PDF`)
    else if (tooBig) onError(`File "${tooBig.name}" lớn hơn ${MAX_ATTACHMENT_MB}MB`)
    else if (valid.length > room) onError(`Đính kèm tối đa ${MAX_ATTACHMENTS} file`)
    else onError(null)
    if (valid.length && room > 0) onChange([...files, ...valid.slice(0, room)])
  }

  // Listener gắn ở document một lần; gọi qua ref để luôn dùng danh sách file mới nhất.
  const addRef = useRef(add)
  useLayoutEffect(() => {
    addRef.current = add
  })

  useEffect(() => {
    let depth = 0
    const onPaste = (e: ClipboardEvent) => {
      const dt = e.clipboardData
      if (!dt) return
      const pasted = clipboardFiles(dt)
      if (!pasted.length) return
      if (isTextField(e.target) && Array.from(dt.types).includes('text/plain')) return
      e.preventDefault()
      addRef.current(renamePasted(pasted))
    }
    const onDragEnter = (e: DragEvent) => {
      if (!hasFiles(e.dataTransfer)) return
      depth += 1
      setDragging(true)
    }
    const onDragLeave = (e: DragEvent) => {
      if (!hasFiles(e.dataTransfer)) return
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDragging(false)
    }
    // Chặn mặc định để thả file lệch ra ngoài ô không làm trình duyệt mở file và mất form đang điền.
    const onDragOver = (e: DragEvent) => {
      if (!hasFiles(e.dataTransfer)) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    }
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e.dataTransfer)) return
      e.preventDefault()
      depth = 0
      setDragging(false)
      addRef.current(Array.from(e.dataTransfer!.files))
    }
    document.addEventListener('paste', onPaste)
    document.addEventListener('dragenter', onDragEnter)
    document.addEventListener('dragleave', onDragLeave)
    document.addEventListener('dragover', onDragOver)
    document.addEventListener('drop', onDrop)
    return () => {
      document.removeEventListener('paste', onPaste)
      document.removeEventListener('dragenter', onDragEnter)
      document.removeEventListener('dragleave', onDragLeave)
      document.removeEventListener('dragover', onDragOver)
      document.removeEventListener('drop', onDrop)
    }
  }, [])

  return (
    <div className="space-y-2">
      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((f, i) => (
            <li key={`${f.name}-${f.size}-${i}`} className="flex items-center gap-2.5 rounded-md border p-1.5 pr-2 text-xs">
              {f.type.startsWith('image/') ? (
                <ImageThumb file={f} />
              ) : (
                <span className="flex size-9 shrink-0 items-center justify-center rounded bg-muted text-muted-foreground">
                  <FileText className="size-4" />
                </span>
              )}
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="shrink-0 text-muted-foreground tabular-nums">{fileSizeLabel(f.size)}</span>
              <button
                type="button"
                aria-label={`Bỏ ${f.name}`}
                disabled={disabled}
                onClick={() => {
                  onChange(files.filter((_, j) => j !== i))
                  onError(null)
                }}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none pointer-coarse:p-2"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!full && (
        <>
          <input
            ref={input}
            type="file"
            accept={ACCEPT_TYPES.join(',')}
            multiple
            className="sr-only"
            tabIndex={-1}
            aria-hidden
            onChange={(e) => {
              add(Array.from(e.target.files ?? []))
              e.target.value = ''
            }}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => input.current?.click()}
            className={cn(
              'flex w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed px-4 py-4 text-center transition-colors',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
              dragging ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'hover:border-foreground/30 hover:bg-muted/40',
            )}
          >
            <Upload className={cn('size-5', dragging ? 'text-primary' : 'text-muted-foreground')} />
            <span className="text-sm font-medium">
              {dragging ? (
                'Thả file vào đây'
              ) : (
                <>
                  <span className="pointer-fine:hidden">Chạm để chọn ảnh hoặc PDF</span>
                  <span className="hidden pointer-fine:inline">Kéo thả, dán ({PASTE_KEY}) hoặc bấm để chọn file</span>
                </>
              )}
            </span>
            <span className="text-xs text-muted-foreground">
              Còn thêm được {MAX_ATTACHMENTS - files.length} file · ảnh hoặc PDF ≤ {MAX_ATTACHMENT_MB}MB
            </span>
          </button>
        </>
      )}
    </div>
  )
}
