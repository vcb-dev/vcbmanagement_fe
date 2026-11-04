import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FaceScan } from '@/features/face/FaceScan'
import { FACE_STATUS_LABEL } from '@/features/face/face.types'
import { useFaceMe } from '@/features/face/use-face'
import { cn } from '@/lib/utils'

export function FacePage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6 lg:p-8">
      <PageHeader
        title="Khuôn mặt"
        description="Đăng ký khuôn mặt một lần. Quản lý duyệt xong, mỗi lần chấm công sẽ đối chiếu khuôn mặt trong ảnh."
      />
      <MyFace />
    </div>
  )
}

function MyFace() {
  const { data, isPending } = useFaceMe()
  const queryClient = useQueryClient()
  const profile = data?.profile
  const tone =
    profile?.status === 'approved'
      ? 'border-emerald-500/25 bg-emerald-500/5'
      : profile?.status === 'rejected'
        ? 'border-destructive/25 bg-destructive/5'
        : 'border bg-muted/30'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Đăng ký khuôn mặt</CardTitle>
        <CardDescription>
          Mở camera và làm theo hướng dẫn (nhìn thẳng, quay trái, quay phải) — giống Face ID, không tải ảnh lên.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPending ? (
          <p className="text-sm text-muted-foreground">Đang tải…</p>
        ) : (
          <div className={cn('rounded-xl border p-3 text-sm', tone)}>
            {!profile ? (
              <p>Bạn chưa đăng ký khuôn mặt. Chưa đăng ký thì không chấm công được.</p>
            ) : (
              <div className="space-y-1">
                <p className="font-medium">
                  Trạng thái: {FACE_STATUS_LABEL[profile.status]} · {profile.photoCount} ảnh
                </p>
                {profile.status === 'pending' && (
                  <p className="text-xs text-muted-foreground">Đang chờ quản lý duyệt. Bạn có thể đăng ký lại bằng camera.</p>
                )}
                {profile.status === 'rejected' && (
                  <p className="text-xs text-destructive">{profile.rejectReason ?? 'Đăng ký bị từ chối, hãy chụp lại.'}</p>
                )}
                {profile.status === 'approved' && (
                  <p className="text-xs text-muted-foreground">Có thể chấm công. Đăng ký lại nếu ngoại hình đổi nhiều.</p>
                )}
              </div>
            )}
          </div>
        )}

        <FaceScan
          kind="enroll"
          idleLabel={profile ? 'Đăng ký lại bằng camera' : 'Mở camera để đăng ký'}
          onDone={() => {
            toast.success('Đã đăng ký khuôn mặt, chờ quản lý duyệt')
            void queryClient.invalidateQueries({ queryKey: ['face'] })
            void queryClient.invalidateQueries({ queryKey: ['attendance', 'today'] })
          }}
        />
      </CardContent>
    </Card>
  )
}
