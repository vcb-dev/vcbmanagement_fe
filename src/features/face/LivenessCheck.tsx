import { CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FaceScan } from './FaceScan'

function remainingLabel(iso: string) {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return null
  const m = Math.ceil(ms / 60_000)
  return `còn ${m} phút`
}

export function LivenessCheck({ expiresAt }: { expiresAt: string | null }) {
  const queryClient = useQueryClient()
  const [, tick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 15_000)
    return () => clearInterval(id)
  }, [])

  const left = expiresAt ? remainingLabel(expiresAt) : null
  if (left) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
        <div>
          <p className="font-medium">Đã xác thực người thật</p>
          <p className="text-xs text-muted-foreground">Hiệu lực {left}. Mỗi lần chấm công cần xác thực lại.</p>
        </div>
      </div>
    )
  }

  return (
    <FaceScan
      kind="liveness"
      idleLabel="Mở camera xác thực khuôn mặt"
      onDone={() => {
        toast.success('Đã xác thực người thật')
        void queryClient.invalidateQueries({ queryKey: ['face'] })
        void queryClient.invalidateQueries({ queryKey: ['attendance', 'today'] })
      }}
    />
  )
}
