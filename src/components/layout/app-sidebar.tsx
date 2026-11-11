import { ArrowRight } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { BrandMark } from '@/components/brand-logo'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { SLOT_LABEL } from '@/features/attendance/attendance.types'
import { useAttendanceToday } from '@/features/attendance/use-attendance'
import type { User } from '@/features/auth/auth.types'
import { useFeedbackCounts } from '@/features/feedbacks/use-feedbacks'
import { formatTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import { NAV_GROUPS } from './nav-items'
import { NavUser } from './nav-user'

export function AppSidebar({ user }: { user: User }) {
  const { pathname } = useLocation()
  const isManagerOrAdmin = user.role === 'admin' || user.role === 'manager'
  const { data: feedbackCounts } = useFeedbackCounts(isManagerOrAdmin)
  const groups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => !item.roles || item.roles.includes(user.role)),
  })).filter((g) => g.items.length > 0)

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent">
              <NavLink to="/">
                <BrandMark className="size-8 rounded-lg shadow-sm" />
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate text-sm font-semibold">VCB Management</span>
                  <span className="truncate text-xs text-muted-foreground">Viên Chi Bảo</span>
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[11px] tracking-wider uppercase">{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const showFeedbackBadge =
                    item.badge === 'feedbackOpen' &&
                    typeof feedbackCounts?.open === 'number' &&
                    feedbackCounts.open > 0

                  return (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.url}
                        tooltip={item.title}
                        className="h-9 data-[active=true]:font-semibold data-[active=true]:shadow-sm data-[active=true]:ring-1 data-[active=true]:ring-border/60"
                      >
                        <NavLink to={item.url}>
                          <item.icon />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                      {showFeedbackBadge && (
                        <SidebarMenuBadge>{feedbackCounts.open}</SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <TodayWidget />
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function TodayWidget() {
  const { data } = useAttendanceToday()
  if (!data) return null
  const { record, nextSlot } = data
  const last = record?.punches.at(-1)
  const working = !!last?.slot.endsWith('_in')
  const label = !record
    ? 'Bạn chưa chấm công hôm nay'
    : last
      ? `${SLOT_LABEL[last.slot]} lúc ${formatTime(last.at)}`
      : 'Đã chấm công'

  return (
    <Link
      to="/attendance"
      className="group/today mx-0.5 mb-1 block rounded-xl border bg-card p-3 shadow-xs transition-shadow hover:shadow-md group-data-[collapsible=icon]:hidden"
    >
      <div className="flex items-center gap-2">
        <span className="relative flex size-2">
          {!record && <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-75" />}
          <span
            className={cn(
              'relative inline-flex size-2 rounded-full',
              !record ? 'bg-amber-500' : working ? 'bg-emerald-500' : 'bg-muted-foreground',
            )}
          />
        </span>
        <span className="text-xs font-medium">Chấm công hôm nay</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 flex items-center gap-1 text-xs font-medium text-primary">
        {nextSlot ? `Chấm công ${SLOT_LABEL[nextSlot].toLowerCase()}` : 'Xem chi tiết'}
        <ArrowRight className="size-3 transition-transform group-hover/today:translate-x-0.5" />
      </p>
    </Link>
  )
}
