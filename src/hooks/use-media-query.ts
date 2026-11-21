import { useCallback, useSyncExternalStore } from 'react'

/** `true` khi media query khớp, tự cập nhật khi đổi cỡ cửa sổ / xoay máy. Ví dụ `useMediaQuery('(min-width: 1024px)')`. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}
