import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { lateLevelName, lateSeverity, lateSeverityDot } from '@/lib/late-levels'
import { cn } from '@/lib/utils'
import type { LateRules } from './late.types'

/** Bộ mốc chung áp dụng trong tháng đang xem; người thuộc bộ mốc riêng được xếp theo bộ của họ. */
export function LateRuleLine({ rules, canConfigure }: { rules: LateRules; canConfigure: boolean }) {
  const { general, customSetCount } = rules

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
      <span>Mốc đi muộn:</span>
      {general.length > 0 ? (
        Array.from({ length: general.length + 1 }, (_, i) => i + 1).map((level) => (
          <span key={level} className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-0.5 whitespace-nowrap">
            <i className={cn('size-1.5 rounded-full', lateSeverityDot(lateSeverity(level, general)))} />
            <b className="font-semibold text-foreground tabular-nums">{lateLevelName(level, general)}</b>
          </span>
        ))
      ) : (
        <span>{customSetCount > 0 ? 'chưa có bộ mốc chung' : 'chưa cấu hình'}</span>
      )}
      {customSetCount > 0 && <span className="px-1">+{customSetCount} bộ mốc riêng</span>}
      {canConfigure && (
        <Link
          to="/departments?tab=late"
          className="inline-flex items-center font-medium text-primary underline-offset-2 hover:underline"
        >
          Cấu hình
          <ChevronRight className="size-3.5" />
        </Link>
      )}
    </div>
  )
}
