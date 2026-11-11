import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api-client'
import type { AnnualLeaveRow, LeaveCandidate } from './annual-leaves.types'

export function useAnnualLeaves(year: number) {
  return useQuery({
    queryKey: ['annual-leaves', year],
    queryFn: async () => {
      const res = await apiClient.get<{ data: AnnualLeaveRow[] }>(`/annual-leaves?year=${year}`)
      return res.data.data
    },
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
