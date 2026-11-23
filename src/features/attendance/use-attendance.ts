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

const DIRECT_API = 'https://vcb-management-be-production.up.railway.app/api/v1'

let networkProofCache: { token: string; at: number } | null = null

/**
 * iPhone mở web qua IPv6 nên IP Vercel chuyển tiếp không trùng IPv4 Wi‑Fi đã lưu.
 * Gọi thẳng Railway (chỉ có bản ghi IPv4) để server tự thấy IP thật rồi ký lại.
 */
async function officeNetworkHeader(): Promise<Record<string, string>> {
  if (typeof window === 'undefined' || !window.location.hostname.endsWith('.vercel.app')) return {}
  if (networkProofCache && Date.now() - networkProofCache.at < 60_000) {
    return { 'X-Office-Network': networkProofCache.token }
  }
  try {
    const res = await fetch(`${DIRECT_API}/attendance/network-proof`, { cache: 'no-store' })
    if (!res.ok) return {}
    const token = (await res.json())?.data?.token
    if (typeof token !== 'string' || !token) return {}
    networkProofCache = { token, at: Date.now() }
    return { 'X-Office-Network': token }
  } catch {
    return {}
  }
}

const KEY = ['attendance'] as const

async function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await apiClient.get<{ data: T }>(url, { params, headers: await officeNetworkHeader() })
  return res.data.data
}

export function useAttendanceToday() {
  return useQuery({
    queryKey: [...KEY, 'today'],
    queryFn: () => get<AttendanceToday>('/attendance/today'),
    staleTime: 15_000,
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
      const res = await apiClient.post<{ data: PhotoCheckResult }>('/attendance/photo-check', form, {
        headers: await officeNetworkHeader(),
      })
      return res.data.data
    },
  })
}

export function useRegisterOfficeWifi() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ location, floor }: { location?: GeoReading; floor: 4 | 5 | 6 }) => {
      const res = await apiClient.post<{ data: { ipAddress: string; floor: number } }>('/attendance/office-wifi', {
        floor,
        latitude: location?.latitude,
        longitude: location?.longitude,
        accuracy: location?.accuracy,
      }, { headers: await officeNetworkHeader() })
      return res.data.data
    },
    onSuccess: ({ ipAddress }) => {
      toast.success(`Đã ghi nhận Wi‑Fi công ty (${ipAddress})`)
      void queryClient.invalidateQueries({ queryKey: [...KEY, 'today'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })
}

export function useUnregisterOfficeWifi() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.delete<{ data: { ipAddress: string } }>('/attendance/office-wifi', {
        headers: await officeNetworkHeader(),
      })
      return res.data.data
    },
    onSuccess: ({ ipAddress }) => {
      toast.success(`Đã gỡ IP ${ipAddress}`)
      void queryClient.invalidateQueries({ queryKey: [...KEY, 'today'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
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
        { headers: await officeNetworkHeader() },
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
