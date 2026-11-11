import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type {
  FullTimeTimesheetReport,
  FullTimeTimesheetRow,
  ManualInput,
  OvertimeDay,
  OvertimeList,
} from './monthly-timesheets.types'

/** Tự tải lại theo chu kỳ để số công máy, thiếu chấm, đi muộn theo kịp chấm công. */
const REFRESH_MS = 30_000

/** Key nằm dưới `attendance` để chấm công xong số liệu tự tải lại. */
const reportKey = (month: string) => ['attendance', 'full-time-timesheets', month] as const
const overtimesKey = (id: string) => ['attendance', 'full-time-overtimes', id] as const

export function useFullTimeTimesheets(month: string) {
  return useQuery({
    queryKey: reportKey(month),
    queryFn: async () => {
      const res = await apiClient.get<{ data: FullTimeTimesheetReport }>('/timesheets/full-time', { params: { month } })
      return res.data.data
    },
    refetchInterval: REFRESH_MS,
  })
}

/** Ghi dòng server trả về vào bảng, khỏi tải lại cả tháng sau mỗi ô sửa. */
async function applyRow(queryClient: QueryClient, month: string, row: FullTimeTimesheetRow) {
  queryClient.setQueryData<FullTimeTimesheetReport>(reportKey(month), (prev) =>
    prev ? { ...prev, rows: prev.rows.map((r) => (r.id === row.id ? row : r)) } : prev,
  )
  // Màn Tăng ca và Công của tôi của chính người đó (nếu quản lý đang sửa dòng của mình).
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['attendance', 'full-time-overtime-report', month] }),
    queryClient.invalidateQueries({ queryKey: ['attendance', 'my-timesheet'] }),
  ])
}

export function useUpdateFullTimeTimesheet(month: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ManualInput }) => {
      const res = await apiClient.patch<{ data: FullTimeTimesheetRow }>(`/timesheets/full-time/${id}`, input)
      return res.data.data
    },
    // Lượt tự tải lại đang chạy có thể mang số cũ về đè lên số vừa lưu.
    onMutate: () => queryClient.cancelQueries({ queryKey: reportKey(month) }),
    onSuccess: (row) => applyRow(queryClient, month, row),
  })
}

export function useOvertimes(id: string) {
  return useQuery({
    queryKey: overtimesKey(id),
    queryFn: async () => {
      const res = await apiClient.get<{ data: OvertimeList }>(`/timesheets/full-time/${id}/overtimes`)
      return res.data.data
    },
  })
}

export function useReplaceOvertimes(month: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, items }: { id: string; items: OvertimeDay[] }) => {
      const res = await apiClient.put<{ data: OvertimeList & { row: FullTimeTimesheetRow } }>(
        `/timesheets/full-time/${id}/overtimes`,
        { items },
      )
      return res.data.data
    },
    onMutate: () => queryClient.cancelQueries({ queryKey: reportKey(month) }),
    onSuccess: ({ row, ...list }) => {
      queryClient.setQueryData<OvertimeList>(overtimesKey(row.id), list)
      return applyRow(queryClient, month, row)
    },
  })
}
