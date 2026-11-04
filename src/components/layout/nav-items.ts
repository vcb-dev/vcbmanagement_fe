import { CalendarClock, LayoutDashboard, ScanFace, ShieldCheck, Sparkles, type LucideIcon } from 'lucide-react'
import type { UserRole } from '@/features/auth/auth.types'

export interface NavItem {
  title: string
  url: string
  icon: LucideIcon
  description?: string
  roles?: UserRole[]
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Tổng quan',
    items: [{ title: 'Bảng điều khiển', url: '/', icon: LayoutDashboard, description: 'Tổng quan hoạt động' }],
  },
  {
    label: 'Nhân sự',
    items: [
      { title: 'Chấm công', url: '/attendance', icon: CalendarClock, description: 'Vào ca, ra ca & bảng công' },
      { title: 'Khuôn mặt', url: '/face', icon: ScanFace, description: 'Đăng ký khuôn mặt của bạn' },
      {
        title: 'Duyệt khuôn mặt',
        url: '/face/review',
        icon: ShieldCheck,
        description: 'Duyệt đăng ký khuôn mặt nhân viên',
        roles: ['admin', 'manager'],
      },
    ],
  },
  {
    label: 'Tiện ích',
    items: [{ title: 'Trợ lý AI', url: '/assistant', icon: Sparkles, description: 'Hỏi đáp với AI nội bộ' }],
  },
]

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items)
