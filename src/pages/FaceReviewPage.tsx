import { Check, ShieldX, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { FACE_STATUS_LABEL, type FaceAdminRow, type FaceProfileStatus } from '@/features/face/face.types'
import { useFaceAdmin, useReviewFace } from '@/features/face/use-face'
import { getApiErrorMessage } from '@/lib/api-client'
import { displayName } from '@/lib/user-display'

export function FaceReviewPage() {
  const [status, setStatus] = useState<FaceProfileStatus | undefined>('pending')
  const { data, isPending, isError, error, refetch } = useFaceAdmin(status)
  const review = useReviewFace()
  const [rejecting, setRejecting] = useState<FaceAdminRow | null>(null)
  const [reason, setReason] = useState('')

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader
        title="Duyệt khuôn mặt"
        description="Xem ảnh đăng ký của nhân viên rồi duyệt hoặc từ chối. Từ chối thì họ phải chụp lại."
      />
      <Card>
        <CardHeader>
          <CardTitle>Đăng ký chờ xử lý</CardTitle>
          <CardDescription>Chỉ quản trị viên và quản lý được duyệt khuôn mặt.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {([undefined, 'pending', 'approved', 'rejected'] as const).map((s) => (
              <Button key={s ?? 'all'} size="sm" variant={status === s ? 'default' : 'outline'} onClick={() => setStatus(s)}>
                {s ? FACE_STATUS_LABEL[s] : 'Tất cả'}
              </Button>
            ))}
          </div>
          {isPending && !data ? (
            <p className="text-sm text-muted-foreground">Đang tải…</p>
          ) : isError ? (
            <p className="py-8 text-center text-sm text-destructive">
              {getApiErrorMessage(error)}{' '}
              <button type="button" className="underline" onClick={() => void refetch()}>
                Thử lại
              </button>
            </p>
          ) : !data?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Không có đăng ký nào.</p>
          ) : (
            <div className="space-y-4">
              {data.map((row) => (
                <div key={row.userId} className="space-y-3 rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{displayName(row.user)}</p>
                      <p className="text-xs text-muted-foreground">{row.user.email}</p>
                    </div>
                    <Badge variant={row.status === 'approved' ? 'default' : row.status === 'rejected' ? 'destructive' : 'outline'}>
                      {FACE_STATUS_LABEL[row.status]}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(row.photoUrls ?? []).map((src) => (
                      <img key={src} src={src} alt="" className="size-24 rounded-lg border object-cover" />
                    ))}
                  </div>
                  {row.rejectReason && <p className="text-xs text-destructive">{row.rejectReason}</p>}
                  <div className="flex flex-wrap gap-2">
                    {row.status !== 'approved' && (
                      <Button size="sm" onClick={() => review.approve.mutate(row.userId)} disabled={review.approve.isPending}>
                        <Check />
                        Duyệt
                      </Button>
                    )}
                    {row.status === 'pending' && (
                      <Button size="sm" variant="outline" onClick={() => setRejecting(row)}>
                        <X />
                        Từ chối
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Xoá đăng ký khuôn mặt của ${displayName(row.user)}?`)) review.remove.mutate(row.userId)
                      }}
                    >
                      <Trash2 />
                      Xoá
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!rejecting} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Từ chối đăng ký</DialogTitle>
            <DialogDescription>
              {rejecting ? displayName(rejecting.user) : ''} sẽ phải chụp lại. Ghi rõ lý do giúp họ sửa.
            </DialogDescription>
          </DialogHeader>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ví dụ: ảnh mờ, đeo khẩu trang" maxLength={255} />
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => {
                if (!rejecting) return
                review.reject.mutate({ userId: rejecting.userId, reason: reason.trim() || undefined })
                setRejecting(null)
                setReason('')
              }}
            >
              <ShieldX />
              Từ chối
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
