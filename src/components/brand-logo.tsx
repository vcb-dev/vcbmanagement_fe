import { ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BrandMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30 ring-1 ring-white/20',
        className,
      )}
    >
      <ShieldCheck className="size-5" />
    </div>
  )
}
