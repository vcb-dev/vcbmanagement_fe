import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Bề rộng hiện tại của một phần tử, cập nhật khi phần tử đổi kích thước (sidebar thu/mở, xoay màn hình).
 * Đo trước khi vẽ nên không bị nháy giữa hai kiểu bố cục. Trả về 0 cho tới lần đo đầu.
 */
export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.getBoundingClientRect().width)
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref, width] as const
}
