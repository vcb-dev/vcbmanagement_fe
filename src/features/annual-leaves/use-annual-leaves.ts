import { useQuery } from '@tanstack/react-query'
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
