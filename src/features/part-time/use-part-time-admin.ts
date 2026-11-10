import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient, getApiErrorMessage } from '@/lib/api-client'
import type {
  CloseMonthResult,
  PartTimeDayView,
  PartTimeSheetRow,
  ShiftEntryInput,
} from './part-time.types'

async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await apiClient.get<{ data: T }>(url, { params })
  return res.data.data
}

/** Tải danh sách bảng công part-time trong tháng (dành cho quản lý). */
export function usePartTimeSheets(month: string) {
  return useQuery({
    queryKey: ['part-time', 'sheets', month],
    queryFn: () => get<PartTimeSheetRow[]>('/timesheets/part-time', { month }),
    placeholderData: (prev) => prev,
  })
}

/** Chốt công tháng cho nhân sự part-time. */
export function useCloseMonth() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (month: string) => {
      const res = await apiClient.post<{ message?: string; data: CloseMonthResult }>(
        '/timesheets/part-time/close',
        { month },
      )
      return res.data
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Đã chốt công tháng')
      void queryClient.invalidateQueries({ queryKey: ['part-time'] })
      void queryClient.invalidateQueries({ queryKey: ['attendance'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

/** Tải chi tiết các ca làm việc của một nhân viên trong tháng. */
export function usePartTimeUserDays(userId: string | null, month: string) {
  return useQuery({
    queryKey: ['part-time', 'days', userId, month],
    queryFn: () => get<PartTimeDayView[]>(`/timesheets/part-time/users/${userId}/days`, { month }),
    enabled: Boolean(userId),
    placeholderData: (prev) => prev,
  })
}

/** Quản lý thêm/sửa ca làm việc (online hoặc ghi tay bù). */
export function useUpsertShiftEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: ShiftEntryInput) => {
      const res = await apiClient.put<{ message?: string; data: unknown }>(
        '/timesheets/part-time/entries',
        input,
      )
      return res.data
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Đã lưu ca')
      void queryClient.invalidateQueries({ queryKey: ['part-time'] })
      void queryClient.invalidateQueries({ queryKey: ['attendance'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

/** Quản lý xoá ca ghi tay. */
export function useDeleteShiftEntry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete<{ message?: string }>(
        `/timesheets/part-time/entries/${id}`,
      )
      return res.data
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Đã xoá ca ghi tay')
      void queryClient.invalidateQueries({ queryKey: ['part-time'] })
      void queryClient.invalidateQueries({ queryKey: ['attendance'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

/** Quản lý nhập tổng giờ online cho bản chốt. */
export function useSetOnlineTotal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ sheetId, hours }: { sheetId: string; hours: number }) => {
      const res = await apiClient.put<{ message?: string; data: unknown }>(
        `/timesheets/part-time/${sheetId}/online-total`,
        { hours },
      )
      return res.data
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Đã lưu tổng giờ online')
      void queryClient.invalidateQueries({ queryKey: ['part-time'] })
      void queryClient.invalidateQueries({ queryKey: ['attendance'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

/** Quản lý bỏ nhập tổng giờ online cho bản chốt. */
export function useClearOnlineTotal() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (sheetId: string) => {
      const res = await apiClient.delete<{ message?: string }>(
        `/timesheets/part-time/${sheetId}/online-total`,
      )
      return res.data
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Đã bỏ nhập tổng giờ online')
      void queryClient.invalidateQueries({ queryKey: ['part-time'] })
      void queryClient.invalidateQueries({ queryKey: ['attendance'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}
