import { Download, Share, Smartphone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  )
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function InstallAppButton({ className }: { className?: string }) {
  const [installed, setInstalled] = useState(false)
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true)
      return
    }
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', () => setInstalled(true))
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (installed) return null

  const onClick = async () => {
    if (promptEvent) {
      await promptEvent.prompt()
      const { outcome } = await promptEvent.userChoice
      if (outcome === 'accepted') {
        setInstalled(true)
        setPromptEvent(null)
      }
      return
    }
    setOpen(true)
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn('size-11 rounded-full md:size-8', className)}
        onClick={() => void onClick()}
        aria-label="Tải ứng dụng về điện thoại"
        title="Tải về điện thoại"
      >
        <Download className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="size-5" />
              Tải VCB về điện thoại
            </DialogTitle>
            <DialogDescription>
              Mở trang này trên điện thoại (Safari / Chrome), rồi thêm ra màn hình chính để chấm công như app.
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-2">
              <Share className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                <b className="font-medium text-foreground">iPhone:</b> Safari → nút Chia sẻ → Thêm vào Màn hình chính.
              </span>
            </li>
            <li className="flex gap-2">
              <Download className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>
                <b className="font-medium text-foreground">Android:</b> Chrome → menu ⋮ → Cài đặt ứng dụng / Thêm vào màn hình chính.
              </span>
            </li>
          </ol>
          <p className="text-xs text-muted-foreground">Cần HTTPS. Camera và GPS chỉ hoạt động khi mở bằng Safari/Chrome hoặc icon đã cài.</p>
        </DialogContent>
      </Dialog>
    </>
  )
}
