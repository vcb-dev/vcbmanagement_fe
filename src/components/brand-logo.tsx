import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#4f46e5] text-white',
        className,
      )}
    >
      <ShieldCheck className="size-5" />
    </div>
  )
}
