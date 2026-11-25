import { cn } from '@/lib/utils'

export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src="/brand-logo.png"
      alt="Viên Chi Bảo"
      className={cn('h-9 w-auto max-w-[10rem] shrink-0 object-contain', className)}
    />
  )
}
