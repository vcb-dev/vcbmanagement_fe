import type { ReactNode } from 'react'

/** Khung nội dung của trang: đệm hai bên khớp với thanh tiêu đề, dùng hết chiều rộng trên màn hình lớn. */
export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[110rem] space-y-4 px-3 py-4 md:px-4">{children}</div>
}
