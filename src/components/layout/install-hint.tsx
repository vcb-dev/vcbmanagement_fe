import { Share, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function InstallHint() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (isStandalone() || sessionStorage.getItem('vcb-hide-install') === '1') return
    if (isIos() || !window.matchMedia('(min-width: 768px)').matches) setShow(true)
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
        className="size-8 shrink-0"
        aria-label="Đóng hướng dẫn cài app"
        onClick={() => {
          sessionStorage.setItem('vcb-hide-install', '1')
          setShow(false)
        }}
      >
        <X />
      </Button>
    </div>
  )
}
