/**
 * Dùng cho `onOpenAutoFocus` của Sheet / Dialog có ô nhập: trên màn cảm ứng không tự focus ô nhập đầu tiên
 * (bàn phím ảo bật lên che nửa màn hình ngay khi vừa mở), focus khung nội dung thay vào để phím Tab và trình đọc màn hình
 * vẫn bắt đầu từ trong sheet. Màn có chuột giữ hành vi mặc định.
 */
export function keepKeyboardClosedOnTouch(event: Event) {
  if (!window.matchMedia('(pointer: coarse)').matches) return
  event.preventDefault()
  if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus({ preventScroll: true })
}
