import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiClient, getApiErrorMessage } from '@/lib/api-client'
import {
  SLOT_LABEL,
  type AttendanceDaily,
  type AttendanceRange,
  type AttendanceRecord,
  type AttendanceSlot,
  type AttendanceToday,
} from './attendance.types'
import type { GeoReading } from './use-geolocation'

const KEY = ['attendance'] as const

async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await apiClient.get<{ data: T }>(url, { params })
  return res.data.data
}

export function useAttendanceToday() {
  return useQuery({
    queryKey: [...KEY, 'today'],
    queryFn: () => get<AttendanceToday>('/attendance/today'),
  })
}

export function useAttendanceRecent(days = 30) {
  return useQuery({
    queryKey: [...KEY, 'recent', days],
    queryFn: () => get<AttendanceRange & { from: string; to: string }>('/attendance/me/recent', { days }),
  })
}

export function useAttendanceMonth(month: string) {
  return useQuery({
    queryKey: [...KEY, 'month', month],
    queryFn: () => get<AttendanceRange & { month: string }>('/attendance/me', { month }),
    placeholderData: (prev) => prev,
  })
}

export function useAttendanceDaily(date: string, enabled = true) {
  return useQuery({
    queryKey: [...KEY, 'daily', date],
    queryFn: () => get<AttendanceDaily>('/attendance/daily', { date }),
    enabled,
    placeholderData: (prev) => prev,
  })
}

export interface PhotoCheckResult {
  screenTime: string | null
  screenDate: string | null
  faceScore: number | null
  sceneScore: number | null
  floorNote: string | null
  replayScore: number | null
}

function appendClientTime(form: FormData) {
  // iOS/Android/web: Date.now() là đồng hồ thiết bị đang mở trang (PWA hay Safari/Chrome đều vậy).
  form.append('clientTime', new Date().toISOString())
}

/** Kiểm tra ảnh ngay sau khi chụp (ngày giờ máy + khuôn mặt + nền), không lưu ảnh. */
export function usePhotoCheck() {
  return useMutation({
    mutationFn: async (photo: Blob) => {
      const form = new FormData()
      form.append('photo', photo, 'check.jpg')
      appendClientTime(form)
      const res = await apiClient.post<{ data: PhotoCheckResult }>('/attendance/photo-check', form)
      return res.data.data
    },
  })
}

export function usePunch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      slot,
      photo,
      note,
      location,
    }: {
      slot: AttendanceSlot
      photo: Blob
      note?: string
      location?: GeoReading
    }) => {
      const form = new FormData()
      form.append('slot', slot)
      if (location) {
        form.append('latitude', String(location.latitude))
        form.append('longitude', String(location.longitude))
        form.append('accuracy', String(location.accuracy))
      }
      form.append('photo', photo, `${slot}.jpg`)
      appendClientTime(form)
      if (note) form.append('note', note)
      const res = await apiClient.post<{ data: { slot: AttendanceSlot; record: AttendanceRecord } }>(
        '/attendance/punch',
        form,
      )
      return res.data.data
    },
    onSuccess: ({ slot }) => {
      toast.success(`Đã chấm công: ${SLOT_LABEL[slot].toLowerCase()}`)
      void queryClient.invalidateQueries({ queryKey: KEY })
      void queryClient.invalidateQueries({ queryKey: ['face'] })
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err))
      // Lượt chấm có thể đã đổi (tab khác) — tải lại để hiện đúng nút.
      void queryClient.invalidateQueries({ queryKey: [...KEY, 'today'] })
    },
  })
}
