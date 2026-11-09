import { Pencil, Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { UserAvatar } from '@/components/layout/nav-user'
import { PageContainer } from '@/components/page-container'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useMe } from '@/features/auth/use-auth'
import { shiftLabel } from '@/features/departments/departments.types'
import { useDepartments } from '@/features/departments/use-departments'
import { useUsers } from '@/features/users/use-users'
import { UserProfileDialog } from '@/features/users/UserProfileDialog'
import type { UserProfile } from '@/features/users/users.types'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatDate, normalizeSearch } from '@/lib/format'
import { EMPLOYMENT_LABEL, displayName } from '@/lib/user-display'
import { cn } from '@/lib/utils'

/** Radix Select không nhận giá trị rỗng. */
const ALL = 'all'
const UNASSIGNED = 'unassigned'

export function UsersPage() {
  const { data: me } = useMe()
  const canEdit = me?.role === 'admin'
  const { data: users, isPending, isError, error, refetch } = useUsers()
  const { data: departments = [] } = useDepartments()
  const [query, setQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState(ALL)
  const [typeFilter, setTypeFilter] = useState(ALL)
  const [editing, setEditing] = useState<UserProfile | null>(null)

  const filtered = useMemo(() => {
    const q = normalizeSearch(query.trim())
    return (users ?? []).filter((u) => {
      const matchesText = !q || normalizeSearch(`${u.fullName ?? ''} ${u.email}`).includes(q)
      const matchesDepartment =
        departmentFilter === ALL || (departmentFilter === UNASSIGNED ? !u.department : u.department?.id === departmentFilter)
      const matchesType = typeFilter === ALL || u.employmentType === typeFilter
      return matchesText && matchesDepartment && matchesType
    })
  }, [users, query, departmentFilter, typeFilter])

  const active = users?.filter((u) => u.isActive) ?? []
  const stats = [
    { label: 'nhân sự', value: active.length },
    { label: 'toàn thời gian', value: active.filter((u) => u.employmentType === 'full_time').length },
    { label: 'part-time', value: active.filter((u) => u.employmentType === 'part_time').length },
    { label: 'chưa gán bộ phận', value: active.filter((u) => !u.department).length, warn: true },
  ]

  return (
    <PageContainer>
      <PageHeader
        title="Nhân sự"
        description={
          users ? (
            <span className="flex flex-wrap gap-x-3 gap-y-1">
              {stats.map((s) => (
                <span key={s.label}>
                  <b
                    className={cn(
                      'font-semibold text-foreground tabular-nums',
                      s.warn && s.value > 0 && 'text-amber-600 dark:text-amber-400',
                    )}
                  >
                    {s.value}
                  </b>{' '}
                  {s.label}
                </span>
              ))}
            </span>
          ) : (
            'Bộ phận quyết định giờ làm và mốc đi muộn của từng người.'
          )
        }
      />

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-56 flex-1 sm:max-w-sm">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm tên hoặc email…"
                aria-label="Tìm nhân sự"
                className="pl-9"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger aria-label="Lọc theo bộ phận" className="min-w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả bộ phận</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
                <SelectItem value={UNASSIGNED}>Chưa gán bộ phận</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger aria-label="Lọc theo loại nhân sự" className="min-w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả loại</SelectItem>
                <SelectItem value="full_time">{EMPLOYMENT_LABEL.full_time}</SelectItem>
                <SelectItem value="part_time">{EMPLOYMENT_LABEL.part_time}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <p className="py-8 text-center text-sm text-destructive">
              {getApiErrorMessage(error)}{' '}
              <button type="button" className="underline" onClick={() => void refetch()}>
                Thử lại
              </button>
            </p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Users className="size-8 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">Không có nhân sự phù hợp. Thử đổi từ khoá hoặc bộ lọc.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nhân sự</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Bộ phận</TableHead>
                  <TableHead className="hidden lg:table-cell">Ca làm</TableHead>
                  <TableHead className="hidden md:table-cell">Ngày ký HĐ</TableHead>
                  {canEdit && <TableHead className="w-20" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((u) => {
                  const department = departments.find((d) => d.id === u.department?.id)
                  return (
                    <TableRow key={u.id} className={cn(!u.isActive && 'opacity-60')}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <UserAvatar user={u} className="size-8 rounded-lg" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">
                              {displayName(u)}
                              {!u.isActive && (
                                <Badge variant="outline" className="ml-2">
                                  Đã khoá
                                </Badge>
                              )}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            u.employmentType === 'part_time' && 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
                          )}
                        >
                          {EMPLOYMENT_LABEL[u.employmentType]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {u.department ? (
                          u.department.name
                        ) : (
                          <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
                            Chưa gán
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground tabular-nums lg:table-cell">
                        {department ? shiftLabel(department) : 'Giờ mặc định'}
                      </TableCell>
                      <TableCell className="hidden tabular-nums md:table-cell">
                        {u.contractStartDate ? formatDate(u.contractStartDate) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => setEditing(u)}>
                            <Pencil />
                            Sửa
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
          {users && filtered.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Hiển thị {filtered.length} trên {users.length} tài khoản
            </p>
          )}
        </CardContent>
      </Card>

      {editing && (
        <UserProfileDialog key={editing.id} user={editing} departments={departments} onClose={() => setEditing(null)} />
      )}
    </PageContainer>
  )
}
