import { CheckCircle2, Clock, Search, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageContainer } from '@/components/page-container'
import { PageHeader } from '@/components/page-header'
import { StatCard } from '@/components/stat-card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { LeaveRequestBoard } from '@/features/leave-requests/LeaveRequestBoard'
import { LATE_EXCUSE_MINUTES, STATUS_LABEL, TYPE_META, TYPE_ORDER } from '@/features/leave-requests/leave-request-format'
import type { LeaveRequestStatus, LeaveRequestType } from '@/features/leave-requests/leave-requests.types'
import { useLeaveRequests } from '@/features/leave-requests/use-leave-requests'
import { FEATURES } from '@/lib/features'
import { NO_SCROLLBAR } from '@/lib/scroll'
import { cn } from '@/lib/utils'

type StatusTab = 'all' | LeaveRequestStatus
const TABS: StatusTab[] = ['pending', 'approved', 'rejected', 'cancelled', 'all']

function oneOf<T extends string>(value: string | null, options: readonly T[]): T | undefined {
  return options.find((o) => o === value)
}

/**
 * Duyệt đơn xin phép cho admin / quản lý. Mặc định mở các đơn đang chờ, đơn có ngày bắt đầu gần nhất lên trước.
 * Duyệt nghỉ phép có trừ phép năm thì phép tháng ở màn Phép năm và Chốt công tháng tự cộng; huỷ duyệt thì hoàn lại.
 * Trang khác mở sẵn bộ lọc qua URL (chỉ đọc lúc mở): `?status=&type=&q=&id=` (`id` là đơn được chọn sẵn).
 */
export function LeaveRequestsPage() {
  const [params] = useSearchParams()
  const [status, setStatus] = useState<StatusTab>(() => oneOf(params.get('status'), TABS) ?? 'pending')
  const [type, setType] = useState<'all' | LeaveRequestType>(() => oneOf(params.get('type'), TYPE_ORDER) ?? 'all')
  const [mineOnly, setMineOnly] = useState(false)
  const [search, setSearch] = useState(() => params.get('q') ?? '')
  const q = useDebouncedValue(search.trim())
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(() => params.get('id'))

  const query = useLeaveRequests({
    status: status === 'all' ? undefined : status,
    type: type === 'all' ? undefined : type,
    q: q || undefined,
    approver: mineOnly ? 'me' : undefined,
    page,
  })
  const counts = query.data?.counts
  const loading = query.isPending && !query.data

  const resetPage = <T,>(set: (v: T) => void) => (v: T) => {
    set(v)
    setPage(1)
  }

  return (
    <PageContainer>
      <PageHeader
        title="Duyệt đơn xin phép"
        description={
          <>
            Đơn nghỉ phép, đi muộn, về sớm, làm việc ngoài văn phòng của nhân sự.
            {/* Điện thoại ẩn phần quy tắc (5 dòng); chi tiết từng đơn đã ghi rõ duyệt xong trừ phép / quỹ đi muộn ra sao. */}
            <span className="hidden sm:inline">
              {' '}
              Duyệt nghỉ phép có trừ phép năm thì tự cộng vào phép tháng; đi muộn được duyệt thì trừ vào {LATE_EXCUSE_MINUTES}{' '}
              phút đi muộn có phép mỗi tháng của người đó, hết thì vẫn tính đi muộn.
            </span>
          </>
        }
      />

      {/* Điện thoại bỏ ba thẻ số: hàng tab ngay dưới đã có đủ số đơn từng trạng thái. */}
      <div className="hidden gap-4 sm:grid sm:grid-cols-3">
        <StatCard icon={Clock} label="Chờ duyệt" value={counts?.pending ?? 0} tone="amber" loading={loading} />
        <StatCard icon={CheckCircle2} label="Đã duyệt" value={counts?.approved ?? 0} tone="emerald" loading={loading} />
        <StatCard icon={XCircle} label="Từ chối" value={counts?.rejected ?? 0} tone="rose" loading={loading} />
      </div>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <Tabs value={status} onValueChange={resetPage((v: string) => setStatus(v as StatusTab))} className="max-w-full min-w-0">
          {/* justify-start: canh giữa thì khi tràn, tab đầu bị cắt mất bên trái và không vuốt tới được. */}
          <TabsList className={cn('h-9 max-w-full justify-start overflow-x-auto', NO_SCROLLBAR)}>
            {TABS.map((t) => (
              <TabsTrigger key={t} value={t} className="text-xs">
                {t === 'all' ? 'Tất cả' : STATUS_LABEL[t]} ({counts?.[t] ?? 0})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:w-60 sm:min-w-[200px] sm:flex-initial">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Tìm theo tên hoặc email…"
              aria-label="Tìm người gửi"
              className="h-9 pl-8 text-xs"
            />
          </div>
          <Select value={type} onValueChange={resetPage((v: string) => setType(v as 'all' | LeaveRequestType))}>
            <SelectTrigger className="h-9 w-36 shrink-0 text-xs sm:w-48" aria-label="Hình thức">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mọi hình thức</SelectItem>
              {TYPE_ORDER.map((t) => (
                <SelectItem key={t} value={t}>
                  {TYPE_META[t].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {FEATURES.leaveApproverPicker && (
            <button
              type="button"
              aria-pressed={mineOnly}
              onClick={() => {
                setMineOnly(!mineOnly)
                setPage(1)
              }}
              className={cn(
                'h-9 rounded-md border px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                mineOnly ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted/60',
              )}
            >
              Gửi tôi duyệt
            </button>
          )}
        </div>
      </div>

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
        showUser
        emptyText={
          status === 'pending' ? 'Không có đơn nào đang chờ duyệt.' : 'Không có đơn phù hợp. Thử đổi bộ lọc hoặc từ khoá.'
        }
      />
    </PageContainer>
  )
}
