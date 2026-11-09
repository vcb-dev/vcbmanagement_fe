import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

function resolveApiBase() {
  const fromEnv = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/+$/, '')
  // Vercel + iPhone: cookie khác domain (Railway) bị Safari chặn → gọi cùng origin qua rewrite.
  if (typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app')) {
    return '/api/v1'
  }
  return fromEnv
}

export const API_BASE_URL = resolveApiBase()

const CSRF_COOKIE = 'vcb_csrf'
const CSRF_HEADER = 'X-CSRF-Token'
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
/** Các endpoint không có phiên trước đó → không cần CSRF, không refresh khi 401. */
const NO_SESSION_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/csrf']

/** JWT nằm trong cookie HttpOnly — JS không đọc/lưu token, chỉ cần gửi kèm cookie. */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

// ─── CSRF (double-submit) ────────────────────────────────────────────────────

let csrfMemory: string | null = null
let csrfInFlight: Promise<string | null> | null = null

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function captureCsrf(data: unknown) {
  const token = (data as { data?: { csrfToken?: unknown } } | undefined)?.data?.csrfToken
  if (typeof token === 'string' && token) csrfMemory = token
}

/** Ưu tiên cookie (cùng origin). FE khác domain không đọc được cookie của BE → dùng token BE trả trong body. */
async function resolveCsrfToken(): Promise<string | null> {
  const fromCookie = readCookie(CSRF_COOKIE)
  if (fromCookie) return (csrfMemory = fromCookie)
  if (csrfMemory) return csrfMemory

  csrfInFlight ??= axios
    .get(`${API_BASE_URL}/auth/csrf`, { withCredentials: true })
    .then((res) => {
      captureCsrf(res.data)
      return csrfMemory
    })
    .catch(() => null)
    .finally(() => {
      csrfInFlight = null
    })
  return csrfInFlight
}

// ─── Refresh (gộp nhiều request 401 đồng thời thành 1 lần refresh) ────────────

let refreshInFlight: Promise<boolean> | null = null

function refreshSession(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    try {
      const csrf = await resolveCsrfToken()
      const res = await axios.post(`${API_BASE_URL}/auth/refresh`, null, {
        withCredentials: true,
        headers: csrf ? { [CSRF_HEADER]: csrf } : undefined,
      })
      captureCsrf(res.data)
      return true
    } catch {
      csrfMemory = null
      return false
    } finally {
      refreshInFlight = null
    }
  })()
  return refreshInFlight
}

let onSessionExpired: (() => void) | null = null

/** App đăng ký hành vi khi phiên hết hạn hẳn (refresh thất bại), vd. xóa cache + chuyển về /login. */
export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler
}

export function clearCsrfMemory() {
  csrfMemory = null
}

// ─── Interceptors ────────────────────────────────────────────────────────────

const matches = (url: string | undefined, paths: string[]) =>
  !!url && paths.some((p) => url.includes(p))

apiClient.interceptors.request.use(async (config) => {
  const method = (config.method || 'get').toUpperCase()
  if (!SAFE_METHODS.has(method) && !matches(config.url, NO_SESSION_ENDPOINTS)) {
    const csrf = await resolveCsrfToken()
    if (csrf) config.headers.set(CSRF_HEADER, csrf)
  }
  if (config.data instanceof FormData) config.headers.delete('Content-Type')
  return config
})

apiClient.interceptors.response.use(
  (response) => {
    captureCsrf(response.data)
    return response
  },
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined
    const status = error.response?.status

    if (
      status === 401 &&
      original &&
      !original._retried &&
      !matches(original.url, [...NO_SESSION_ENDPOINTS, '/auth/refresh', '/auth/logout'])
    ) {
      original._retried = true
      if (await refreshSession()) return apiClient(original)
      onSessionExpired?.()
    }
    return Promise.reject(error)
  },
)

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'Không kết nối được máy chủ'
    const data = error.response.data as { message?: unknown; errors?: unknown } | undefined
    if (Array.isArray(data?.errors) && data.errors.length) return data.errors.join(', ')
    if (typeof data?.message === 'string' && data.message) return data.message
    if (error.response.status === 403) return 'Bạn không có quyền thực hiện thao tác này'
  }
  if (error instanceof Error) return error.message
  return 'Đã có lỗi xảy ra'
}
