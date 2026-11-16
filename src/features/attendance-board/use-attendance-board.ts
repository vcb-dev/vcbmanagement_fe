import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { AdjustInput, AttendanceBoard, BoardDayDetail } from './attendance-board.types'

/** Tự tải lại theo chu kỳ để thấy lượt chấm công mới của mọi người. */
const REFRESH_MS = 30_000

/** Key nằm dưới `attendance` để chấm công xong bảng tự tải lại. */
const boardKey = (month: string) => ['attendance', 'board', month] as const
const dayKey = (userId: string, date: string) => ['attendance', 'board-day', userId, date] as const

export function useAttendanceBoard(month: string) {
  return useQuery({
    queryKey: boardKey(month),
    queryFn: async () => {
      const res = await apiClient.get<{ data: AttendanceBoard }>('/attendance/board', { params: { month } })
      return res.data.data
    },
    refetchInterval: REFRESH_MS,
  })
}

export function useBoardDay(userId: string, date: string) {
  return useQuery({
    queryKey: dayKey(userId, date),
    queryFn: async () => {
      const res = await apiClient.get<{ data: BoardDayDetail }>(`/attendance/board/${userId}/${date}`)
      return res.data.data
    },
  })
}

/**
 * Giờ bổ sung đổi công máy, đi muộn, thiếu chấm: tải lại bảng, chốt công tháng, đi muộn, công của tôi.
 * Chi tiết ngày vừa lưu đã có từ server nên không tải lại.
 */
async function applyDay(queryClient: QueryClient, detail: BoardDayDetail) {
  queryClient.setQueryData(dayKey(detail.user.id, detail.date), detail)
  await queryClient.invalidateQueries({ queryKey: ['attendance'], predicate: (q) => q.queryKey[1] !== 'board-day' })
}

export function useAdjustDay() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, date, input }: { userId: string; date: string; input: AdjustInput }) => {
      const res = await apiClient.put<{ data: BoardDayDetail }>(`/attendance/board/${userId}/${date}`, input)
      return res.data.data
    },
    onSuccess: (detail) => applyDay(queryClient, detail),
  })
}

export function useRestoreDay() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, date }: { userId: string; date: string }) => {
      const res = await apiClient.delete<{ data: BoardDayDetail }>(`/attendance/board/${userId}/${date}/adjustment`)
      return res.data.data
    },
    onSuccess: (detail) => applyDay(queryClient, detail),
  })
}
