import { Share, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

/** Đã đóng gợi ý thì nhớ lâu dài, không hiện lại mỗi lần mở app. Bộ nhớ trình duyệt có thể bị chặn nên bọc try. */
function readHidden() {
  try {
    return localStorage.getItem('vcb-hide-install') === '1' || sessionStorage.getItem('vcb-hide-install') === '1'
  } catch {
    return false
  }
}

function writeHidden() {
  try {
    localStorage.setItem('vcb-hide-install', '1')
  } catch {
    // Không lưu được thì chỉ ẩn trong lần này.
  }
}

export function InstallHint() {
  const [show, setShow] = useState(() => {
    if (typeof window === 'undefined') return false
    if (isStandalone() || readHidden()) return false
    return isIos() || window.innerWidth < 768
  })

  useEffect(() => {
    if (isStandalone() || readHidden()) {
      setShow(false)
      return
    }
    setShow(isIos() || window.innerWidth < 768)
  }, [])

  if (!show) return null

  return (
    <div className="flex items-start gap-2 rounded-xl border bg-muted/40 px-3 py-2 text-xs text-muted-foreground md:hidden">
      <Share className="mt-0.5 size-4 shrink-0 text-primary" />
      <p className="min-w-0 flex-1 leading-relaxed">
        {isIos()
          ? 'Thêm ra màn hình chính: Safari → nút Chia sẻ → Thêm vào Màn hình chính. Cần HTTPS để mở camera.'
          : 'Chrome: menu ⋮ → Cài đặt ứng dụng (hoặc Thêm vào màn hình chính). Cần HTTPS để mở camera và GPS.'}
      </p>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="size-8 shrink-0 pointer-coarse:size-11"
        aria-label="Đóng hướng dẫn cài app"
        onClick={() => {
          writeHidden()
          setShow(false)
        }}
      >
        <X />
      </Button>
    </div>
  )
}
