import { Pencil, Search, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { UserAvatar } from '@/components/layout/nav-user'
import { PageContainer } from '@/components/page-container'
import { PageHeader } from '@/components/page-header'
import { PaginationBar } from '@/components/pagination-bar'
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
const PAGE_SIZE = 15
/** Tiêu đề bảng canh giữa, chữ đậm, cùng kiểu với các bảng khác. */
const HEAD = 'text-center text-sm font-semibold'

export function UsersPage() {
  const { data: me } = useMe()
  const canEdit = me?.role === 'admin'
  const { data: users, isPending, isError, error, refetch } = useUsers()
  const { data: departments = [] } = useDepartments()
  const [query, setQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState(ALL)
  const [typeFilter, setTypeFilter] = useState(ALL)
  const [page, setPage] = useState(1)
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

  // Sửa hồ sơ làm danh sách ngắn lại (vd đổi bộ phận khi đang lọc) thì giữ ở trang cuối còn dòng.
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  /** Đổi từ khoá hoặc bộ lọc thì quay về trang đầu. */
  function resetPageAfter(change: () => void) {
    change()
    setPage(1)
  }

  return (
    <PageContainer>
      <PageHeader title="Nhân sự" description="Bộ phận quyết định giờ làm và mốc đi muộn của từng người." />

      <Card>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-56 flex-1 sm:max-w-sm">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => resetPageAfter(() => setQuery(e.target.value))}
                placeholder="Tìm tên hoặc email…"
                aria-label="Tìm nhân sự"
                className="pl-9"
              />
            </div>
            <Select value={departmentFilter} onValueChange={(next) => resetPageAfter(() => setDepartmentFilter(next))}>
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
            <Select value={typeFilter} onValueChange={(next) => resetPageAfter(() => setTypeFilter(next))}>
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
                  <TableHead className={HEAD}>Nhân sự</TableHead>
                  <TableHead className={HEAD}>Loại</TableHead>
                  <TableHead className={HEAD}>Bộ phận</TableHead>
                  <TableHead className={cn(HEAD, 'hidden lg:table-cell')}>Ca làm</TableHead>
                  <TableHead className={cn(HEAD, 'hidden md:table-cell')}>Ngày ký HĐ</TableHead>
                  {canEdit && <TableHead className="w-20" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((u) => {
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
                      <TableCell className="text-center">
                        <Badge
                          variant="secondary"
                          className={cn(
                            u.employmentType === 'part_time' && 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
                          )}
                        >
                          {EMPLOYMENT_LABEL[u.employmentType]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {u.department ? (
                          u.department.name
                        ) : (
                          <Badge variant="secondary" className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
                            Chưa gán
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden text-center text-muted-foreground tabular-nums lg:table-cell">
                        {department ? shiftLabel(department) : 'Giờ mặc định'}
                      </TableCell>
                      <TableCell className="hidden text-center tabular-nums md:table-cell">
                        {u.contractStartDate ? formatDate(u.contractStartDate) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      {canEdit && (
                        <TableCell className="text-center">
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
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>
                Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} trong{' '}
                {filtered.length}
                {filtered.length < users.length && ` (tổng ${users.length})`} tài khoản
              </span>
              <PaginationBar page={currentPage} pageCount={pageCount} onChange={setPage} />
            </div>
          )}
        </CardContent>
      </Card>

      {editing && (
        <UserProfileDialog key={editing.id} user={editing} departments={departments} onClose={() => setEditing(null)} />
      )}
    </PageContainer>
  )
}
