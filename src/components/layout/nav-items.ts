import {
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  LayoutDashboard,
  ScanFace,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Users,
  type LucideIcon,
} from 'lucide-react'
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
    items: [
      { title: 'Bảng điều khiển', url: '/', icon: LayoutDashboard, description: 'Tổng quan hoạt động' },
      { title: 'Công của tôi', url: '/my-timesheet', icon: CalendarDays, description: 'Lịch chấm công và công tháng của bạn' },
    ],
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
      {
        title: 'Đi muộn',
        url: '/late',
        icon: TriangleAlert,
        description: 'Đi muộn theo ngày và theo mốc của nhân sự',
        roles: ['admin', 'manager'],
      },
      {
        title: 'Công part-time',
        url: '/part-time-timesheets',
        icon: ClipboardCheck,
        description: 'Chốt công và trao đổi với nhân viên part-time',
        roles: ['admin', 'manager'],
      },
      {
        title: 'Phép năm',
        url: '/annual-leaves',
        icon: CalendarCheck,
        description: 'Phép năm và ngày nghỉ các tháng của nhân sự toàn thời gian',
        roles: ['admin', 'manager'],
      },
      {
        title: 'Bộ phận & giờ làm',
        url: '/departments',
        icon: Building2,
        description: 'Giờ ca của bộ phận và mốc đi muộn',
        roles: ['admin', 'manager'],
      },
      {
        title: 'Danh sách nhân sự',
        url: '/users',
        icon: Users,
        description: 'Bộ phận, loại nhân sự và ngày ký hợp đồng',
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
