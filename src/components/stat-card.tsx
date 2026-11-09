import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const TONES = {
  indigo: 'bg-[#eef2ff] text-[#4f46e5]',
  emerald: 'bg-[#ecfdf5] text-[#059669]',
  amber: 'bg-[#fffbeb] text-[#d97706]',
  rose: 'bg-[#fff1f2] text-[#e11d48]',
  violet: 'bg-[#f5f3ff] text-[#7c3aed]',
  sky: 'bg-[#f0f9ff] text-[#0284c7]',
} as const

export type StatTone = keyof typeof TONES

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'indigo',
  loading,
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: StatTone
  loading?: boolean
}) {
  return (
    <Card className="gap-0 p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-zinc-500">{label}</p>
        <div className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', TONES[tone])}>
          <Icon className="size-4.5" />
        </div>
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-24" />
      ) : (
        <p className="mt-1 text-2xl font-semibold text-zinc-900" style={{ fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </p>
      )}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  )
}
