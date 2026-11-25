import { FileText, Plus } from 'lucide-react'
import { useState } from 'react'
import { PageContainer } from '@/components/page-container'
import { PageHeader } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LeaveRequestBoard } from '@/features/leave-requests/LeaveRequestBoard'
import { LeaveRequestFormDialog } from '@/features/leave-requests/LeaveRequestFormDialog'
import { LATE_EXCUSE_MINUTES, STATUS_LABEL } from '@/features/leave-requests/leave-request-format'
import type { LeaveRequestStatus } from '@/features/leave-requests/leave-requests.types'
import { useMyLeaveRequests } from '@/features/leave-requests/use-leave-requests'

type StatusTab = 'all' | LeaveRequestStatus
const TABS: StatusTab[] = ['all', 'pending', 'approved', 'rejected', 'cancelled']

/**
 * Đơn xin phép của tôi: nhân sự gửi đơn nghỉ phép, đi muộn, về sớm, làm việc ngoài văn phòng (thay form Lark),
 * theo dõi kết quả duyệt và rút đơn đang chờ.
 */
export function MyLeaveRequestsPage() {
  const [status, setStatus] = useState<StatusTab>('all')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const query = useMyLeaveRequests({ status: status === 'all' ? undefined : status, page })
  const counts = query.data?.counts
  const noneYet = counts?.all === 0 && !query.isPending

  return (
    <PageContainer>
      <PageHeader
        title="Đơn xin phép"
        description={`Xin nghỉ phép, đi muộn, về sớm hoặc làm việc ngoài văn phòng. Nghỉ phép có trừ phép năm được trừ khi đơn được duyệt; mỗi tháng có ${LATE_EXCUSE_MINUTES} phút đi muộn có phép, đơn đi muộn được duyệt trừ dần vào đó.`}
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus />
            Tạo đơn
          </Button>
        }
      />

      {noneYet ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card/50 px-6 py-14 text-center">
          <FileText className="size-9 text-muted-foreground/50" />
          <p className="text-sm font-medium">Bạn chưa gửi đơn nào</p>
          <p className="max-w-md text-sm text-muted-foreground">
            Cần nghỉ, đến muộn, về sớm hay làm việc bên ngoài thì bấm{' '}
            <b className="font-medium text-foreground">Tạo đơn</b> để gửi leader hoặc quản lý duyệt.
          </p>
          <Button className="mt-2" onClick={() => setFormOpen(true)}>
            <Plus />
            Tạo đơn
          </Button>
        </div>
      ) : (
        <>
          <Tabs
            value={status}
            onValueChange={(v) => {
              setStatus(v as StatusTab)
              setPage(1)
            }}
          >
            <TabsList className="h-9 max-w-full overflow-x-auto">
              {TABS.map((t) => (
                <TabsTrigger key={t} value={t} className="text-xs">
                  {t === 'all' ? 'Tất cả' : STATUS_LABEL[t]} ({counts?.[t] ?? 0})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <LeaveRequestBoard
            data={query.data}
            isPending={query.isPending}
            isError={query.isError}
            error={query.error}
            onRetry={() => void query.refetch()}
            page={page}
            onPageChange={setPage}
            selectedId={selectedId}
            onSelect={setSelectedId}
            emptyText={status === 'all' ? 'Chưa có đơn nào.' : `Không có đơn nào ${STATUS_LABEL[status].toLowerCase()}.`}
          />
        </>
      )}

      <LeaveRequestFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        onCreated={(detail) => {
          setStatus('all')
          setPage(1)
          setSelectedId(detail.id)
        }}
      />
    </PageContainer>
  )
}
