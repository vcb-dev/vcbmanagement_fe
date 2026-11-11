import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type {
  AnnualLeavePage,
  AnnualLeaveRow,
  LeaveCandidate,
  LeaveFilter,
  LeaveSort,
} from './annual-leaves.types'

export interface AnnualLeaveListParams {
  year: number
  page: number
  filter: LeaveFilter
  sort: LeaveSort
  q?: string
}

/** Một trang dòng phép năm; lọc tab, tìm kiếm và sắp xếp làm ở BE. */
export function useAnnualLeaves(params: AnnualLeaveListParams) {
  return useQuery({
    queryKey: ['annual-leaves', 'list', params],
    queryFn: async () => {
      const res = await apiClient.get<{ data: AnnualLeavePage }>('/annual-leaves', { params })
      return res.data.data
    },
    // Giữ trang cũ khi đổi trang / bộ lọc cho đỡ nháy, nhưng không đem dòng năm khác sang năm mới.
    placeholderData: (prev, prevQuery) =>
      (prevQuery?.queryKey[2] as AnnualLeaveListParams | undefined)?.year === params.year
        ? prev
        : undefined,
  })
}

/** Các dòng ghi nghỉ phép được trong năm, chỉ tải khi mở hộp "Ghi nhận nghỉ phép". */
export function useRecordableLeaves(year: number, enabled: boolean) {
  return useQuery({
    queryKey: ['annual-leaves', 'recordable', year],
    queryFn: async () => {
      const res = await apiClient.get<{ data: AnnualLeaveRow[] }>('/annual-leaves/recordable', {
        params: { year },
      })
      return res.data.data
    },
    enabled,
  })
}

export function useLeaveCandidates(year: number, enabled = true) {
  return useQuery({
    queryKey: ['annual-leaves', 'candidates', year],
    queryFn: async () => {
      const res = await apiClient.get<{ data: LeaveCandidate[] }>(`/annual-leaves/candidates?year=${year}`)
      return res.data.data
    },
    enabled,
  })
}

export function useCreateLeaveRow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { userId: string; year: number; entitledDays: number }) => {
      const res = await apiClient.post<{ message: string; data: AnnualLeaveRow }>('/annual-leaves', payload)
      return res.data
    },
    onSuccess: (data) => {
      toast.success(data.message)
      void queryClient.invalidateQueries({ queryKey: ['annual-leaves'] })
    },
  })
}

export function useSaveLeaveRow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      entitledDays,
      months,
    }: {
      id: string
      entitledDays?: number
      months?: number[]
    }) => {
      const res = await apiClient.patch<{ message: string; data: AnnualLeaveRow }>(`/annual-leaves/${id}`, {
        entitledDays,
        months,
      })
      return res.data
    },
    onSuccess: (data) => {
      toast.success(data.message)
      void queryClient.invalidateQueries({ queryKey: ['annual-leaves'] })
    },
  })
}

export function useRecordLeave() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      month,
      days,
    }: {
      id: string
      month: number
      days: number
    }) => {
      const res = await apiClient.post<{ message: string; data: AnnualLeaveRow }>(`/annual-leaves/${id}/usages`, {
        month,
        days,
      })
      return res.data
    },
    onSuccess: (data) => {
      toast.success(data.message)
      void queryClient.invalidateQueries({ queryKey: ['annual-leaves'] })
    },
  })
}

export function useDeleteLeaveRow() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete<{ message: string }>(`/annual-leaves/${id}`)
      return res.data
    },
    onSuccess: (data) => {
      toast.success(data.message)
      void queryClient.invalidateQueries({ queryKey: ['annual-leaves'] })
    },
  })
}
