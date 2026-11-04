import { useCallback, useEffect, useState } from 'react'

export interface GeoReading {
  latitude: number
  longitude: number
  /** Sai số (mét). */
  accuracy: number
}

export type GeoState =
  | { status: 'off' }
  | { status: 'locating' }
  | { status: 'ok'; reading: GeoReading }
  | { status: 'denied' }
  | { status: 'unsupported'; reason: string }
  | { status: 'error'; message: string }

/** Theo dõi vị trí liên tục khi `enabled` — GPS điện thoại chính xác dần sau vài giây. */
export function useGeolocation(enabled: boolean) {
  const [state, setState] = useState<GeoState>({ status: 'off' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!enabled) return
    if (!window.isSecureContext) {
      setState({ status: 'unsupported', reason: 'Định vị chỉ hoạt động trên HTTPS (hoặc localhost)' })
      return
    }
    if (!('geolocation' in navigator)) {
      setState({ status: 'unsupported', reason: 'Trình duyệt không hỗ trợ định vị' })
      return
    }

    setState({ status: 'locating' })
    const id = navigator.geolocation.watchPosition(
      ({ coords }) =>
        setState({
          status: 'ok',
          reading: { latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy },
        }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setState({ status: 'denied' })
        else if (err.code === err.TIMEOUT) setState({ status: 'error', message: 'Hết thời gian chờ định vị' })
        else setState({ status: 'error', message: 'Không lấy được vị trí' })
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [enabled, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  return { state: enabled ? state : ({ status: 'off' } as const), retry }
}

export interface GeoVerdict {
  allowed: boolean
  tone: 'ok' | 'warn' | 'bad' | 'pending'
  title: string
  detail?: string
  canRetry?: boolean
}

/** Cùng quy tắc với server để báo trước cho người dùng; server vẫn kiểm tra lại. */
export function geoVerdict(
  fence: { latitude: number; longitude: number; radiusMeters: number; maxAccuracyMeters: number },
  state: GeoState,
): GeoVerdict {
  switch (state.status) {
    case 'off':
    case 'locating':
      return { allowed: false, tone: 'pending', title: 'Đang xác định vị trí…', detail: 'Hãy cho phép truy cập vị trí khi trình duyệt hỏi' }
    case 'denied':
      return {
        allowed: false,
        tone: 'bad',
        title: 'Bạn đã chặn quyền vị trí',
        detail: 'Bật lại quyền vị trí cho trang này trong cài đặt trình duyệt rồi thử lại',
        canRetry: true,
      }
    case 'unsupported':
      return { allowed: false, tone: 'bad', title: 'Không định vị được', detail: state.reason }
    case 'error':
      return { allowed: false, tone: 'bad', title: state.message, detail: 'Kiểm tra GPS / dịch vụ vị trí đã bật chưa', canRetry: true }
    case 'ok': {
      const { reading } = state
      const distance = distanceMeters(reading, fence)
      const accuracy = `sai số ±${formatMeters(reading.accuracy)}`
      if (reading.accuracy > fence.maxAccuracyMeters) {
        return {
          allowed: false,
          tone: 'warn',
          title: 'Vị trí chưa đủ chính xác',
          detail:
            `Cách công ty ~${formatMeters(distance)}, ${accuracy} (cần tối đa ±${fence.maxAccuracyMeters}m). ` +
            'Máy tính định vị qua Wi-Fi nên kém chính xác — nên chấm công bằng điện thoại',
        }
      }
      if (distance - reading.accuracy > fence.radiusMeters) {
        return {
          allowed: false,
          tone: 'bad',
          title: `Ngoài khu vực công ty · cách ${formatMeters(distance)}`,
          detail: `Chỉ được chấm công trong bán kính ${fence.radiusMeters}m (${accuracy})`,
          canRetry: true,
        }
      }
      return { allowed: true, tone: 'ok', title: 'Đang ở công ty', detail: `Cách ${formatMeters(distance)} · ${accuracy}` }
    }
  }
}

const EARTH_RADIUS_M = 6_371_000

/** Khoảng cách đường chim bay (haversine), đơn vị mét — cùng công thức với server. */
export function distanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const rad = (deg: number) => (deg * Math.PI) / 180
  const dLat = rad(b.latitude - a.latitude)
  const dLng = rad(b.longitude - a.longitude)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h))
}

export function formatMeters(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`
}
