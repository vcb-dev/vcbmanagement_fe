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
import { shiftLabel, type Department } from '@/features/departments/departments.types'
import { useDepartments } from '@/features/departments/use-departments'
import { useUsers } from '@/features/users/use-users'
import { UserProfileDialog } from '@/features/users/UserProfileDialog'
import type { UserProfile } from '@/features/users/users.types'
import { useElementWidth } from '@/hooks/use-element-width'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatDate, normalizeSearch } from '@/lib/format'
import { EMPLOYMENT_LABEL, ROLE_LABEL, displayName } from '@/lib/user-display'
import { cn } from '@/lib/utils'

/** Radix Select không nhận giá trị rỗng. */
const ALL = 'all'
const UNASSIGNED = 'unassigned'
const PAGE_SIZE = 15
/** Tiêu đề bảng canh giữa, chữ đậm, cùng kiểu với các bảng khác. */
const HEAD = 'text-center text-sm font-semibold'
/** Khung hẹp hơn mức này thì bảng phải cuộn ngang, nên hiện danh sách mỗi người một dòng. */
const TABLE_MIN_WIDTH = 800
/** Cột Ca làm dài (có cả ca tối), chỉ thêm vào bảng khi khung đủ rộng cho nó. */
const SHIFT_COLUMN_MIN_WIDTH = 1100
/** Ô nhập và ô chọn: trên màn cảm ứng cao 40px cho dễ bấm. */
const TOUCH_FIELD = 'pointer-coarse:h-10'
const TOUCH_SELECT = 'pointer-coarse:data-[size=default]:h-10'

function EmploymentBadge({ user }: { user: UserProfile }) {
  return (
    <Badge
      variant="secondary"
      className={cn(user.employmentType === 'part_time' && 'bg-violet-500/10 text-violet-800 dark:text-violet-300')}
    >
      {EMPLOYMENT_LABEL[user.employmentType]}
    </Badge>
  )
}

/** Đa số là nhân viên nên chỉ ghi chữ mờ; các vai trò khác hiện thành nhãn cho dễ thấy. */
function RoleBadge({ user }: { user: UserProfile }) {
  if (user.role === 'staff') return <span className="text-[13px] text-muted-foreground">{ROLE_LABEL.staff}</span>
  return (
    <Badge variant="outline" className={cn(user.role === 'admin' && 'border-primary/40 text-primary')}>
      {ROLE_LABEL[user.role]}
    </Badge>
  )
}

/** Trong bảng đã có tiêu đề cột Bộ phận nên chỉ cần "Chưa gán"; ở danh sách thì nói rõ là bộ phận. */
function UnassignedBadge({ full = false }: { full?: boolean }) {
  return (
    <Badge variant="secondary" className="bg-amber-500/10 text-amber-800 dark:text-amber-300">
      {full ? 'Chưa gán bộ phận' : 'Chưa gán'}
    </Badge>
  )
}

function LockedBadge() {
  return (
    <Badge variant="outline" className="ml-2">
      Đã khoá
    </Badge>
  )
}

/**
 * Một nhân sự khi khung hẹp (điện thoại, máy tính bảng, laptop nhỏ có sidebar mở): ảnh bên trái, tên và email,
 * rồi vai trò (nếu không phải nhân viên), loại, bộ phận, tầng, ca làm, ngày ký HĐ ngay dưới để không phải vuốt ngang; nút Sửa ở bên phải.
 */
function UserItem({
  user: u,
  department,
  canEdit,
  onEdit,
}: {
  user: UserProfile
  department: Department | undefined
  canEdit: boolean
  onEdit: () => void
}) {
  return (
    <li className={cn('flex gap-3 px-(--card-spacing) py-3', !u.isActive && 'opacity-60')}>
      <UserAvatar user={u} className="size-9 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {displayName(u)}
            {!u.isActive && <LockedBadge />}
          </p>
          <p className="truncate text-xs text-muted-foreground">{u.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {u.role !== 'staff' && <RoleBadge user={u} />}
          <EmploymentBadge user={u} />
          {u.department ? <span className="min-w-0 text-[13px]">{u.department.name}</span> : <UnassignedBadge full />}
        </div>
        <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground tabular-nums">
          <span className="whitespace-nowrap">{u.officeFloor ? `Tầng ${u.officeFloor}` : 'Chưa gán tầng'}</span>
          <span>{department ? shiftLabel(department) : 'Giờ mặc định'}</span>
          <span className="whitespace-nowrap">
            {u.contractStartDate ? `Ký HĐ ${formatDate(u.contractStartDate)}` : 'Chưa có ngày ký HĐ'}
          </span>
        </p>
      </div>
      {canEdit && (
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 pointer-coarse:h-10"
          aria-label={`Sửa hồ sơ ${displayName(u)}`}
          onClick={onEdit}
        >
          <Pencil />
          Sửa
        </Button>
      )}
    </li>
  )
}

export function UsersPage() {
  const { data: me } = useMe()
  const canEdit = me?.role === 'admin'
  const { data: users, isPending, isError, error, refetch } = useUsers()
  const { data: departments = [] } = useDepartments()
  const [query, setQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState(ALL)
  const [typeFilter, setTypeFilter] = useState(ALL)
  const [floorFilter, setFloorFilter] = useState(ALL)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<UserProfile | null>(null)
  // Chọn bảng hay danh sách theo bề rộng khung thẻ, không theo màn hình: sidebar mở hay thu cũng tính đúng.
  const [boxRef, boxWidth] = useElementWidth<HTMLDivElement>()
  const asTable = boxWidth >= TABLE_MIN_WIDTH
  const showShift = boxWidth >= SHIFT_COLUMN_MIN_WIDTH

  const filtered = useMemo(() => {
    const q = normalizeSearch(query.trim())
    return (users ?? []).filter((u) => {
      const matchesText = !q || normalizeSearch(`${u.fullName ?? ''} ${u.email}`).includes(q)
      const matchesDepartment =
        departmentFilter === ALL || (departmentFilter === UNASSIGNED ? !u.department : u.department?.id === departmentFilter)
      const matchesType = typeFilter === ALL || u.employmentType === typeFilter
      const matchesFloor =
        floorFilter === ALL ||
        (floorFilter === UNASSIGNED ? !u.officeFloor : String(u.officeFloor) === floorFilter)
      return matchesText && matchesDepartment && matchesType && matchesFloor
    })
  }, [users, query, departmentFilter, typeFilter, floorFilter])

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
      <PageHeader title="Nhân sự" description="Bộ phận quyết định giờ làm và mốc đi muộn của từng người." hideTitleOnPhone />

      <Card>
        <CardContent ref={boxRef} className="space-y-4">
          {/* Điện thoại: ô tìm và ô bộ phận (tên dài) hết hàng, tầng và loại chia đôi hàng dưới. */}
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <div className="relative col-span-2 sm:min-w-56 sm:flex-1 sm:max-w-sm">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => resetPageAfter(() => setQuery(e.target.value))}
                placeholder="Tìm tên hoặc email…"
                aria-label="Tìm nhân sự"
                className={cn('pl-9', TOUCH_FIELD)}
              />
            </div>
            <Select value={departmentFilter} onValueChange={(next) => resetPageAfter(() => setDepartmentFilter(next))}>
              <SelectTrigger
                aria-label="Lọc theo bộ phận"
                className={cn('col-span-2 w-full min-w-0 sm:w-fit sm:min-w-44', TOUCH_SELECT)}
              >
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
            <Select value={floorFilter} onValueChange={(next) => resetPageAfter(() => setFloorFilter(next))}>
              <SelectTrigger aria-label="Lọc theo tầng" className={cn('w-full min-w-0 sm:w-fit sm:min-w-36', TOUCH_SELECT)}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tất cả tầng</SelectItem>
                <SelectItem value="4">Tầng 4</SelectItem>
                <SelectItem value="5">Tầng 5</SelectItem>
                <SelectItem value="6">Tầng 6</SelectItem>
                <SelectItem value={UNASSIGNED}>Chưa gán tầng</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(next) => resetPageAfter(() => setTypeFilter(next))}>
              <SelectTrigger aria-label="Lọc theo loại nhân sự" className={cn('w-full min-w-0 sm:w-fit sm:min-w-40', TOUCH_SELECT)}>
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
          ) : !asTable ? (
            // Chỉ dựng một kiểu (bảng hoặc danh sách). Các dòng chạy sát hai mép thẻ, kẻ ngang giữa các người.
            <ul aria-label="Danh sách nhân sự" className="-mx-(--card-spacing) divide-y divide-border/70 border-y border-border/70">
              {pageRows.map((u) => (
                <UserItem
                  key={u.id}
                  user={u}
                  department={departments.find((d) => d.id === u.department?.id)}
                  canEdit={canEdit}
                  onEdit={() => setEditing(u)}
                />
              ))}
            </ul>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={HEAD}>Nhân sự</TableHead>
                  <TableHead className={HEAD}>Vai trò</TableHead>
                  <TableHead className={HEAD}>Loại</TableHead>
                  <TableHead className={HEAD}>Bộ phận</TableHead>
                  <TableHead className={HEAD}>Tầng</TableHead>
                  {showShift && <TableHead className={HEAD}>Ca làm</TableHead>}
                  <TableHead className={HEAD}>Ngày ký HĐ</TableHead>
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
                              {!u.isActive && <LockedBadge />}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        <RoleBadge user={u} />
                      </TableCell>
                      <TableCell className="text-center">
                        <EmploymentBadge user={u} />
                      </TableCell>
                      <TableCell className="text-center">{u.department ? u.department.name : <UnassignedBadge />}</TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {u.officeFloor ? `Tầng ${u.officeFloor}` : <UnassignedBadge />}
                      </TableCell>
                      {showShift && (
                        <TableCell className="text-center text-muted-foreground tabular-nums">
                          {department ? shiftLabel(department) : 'Giờ mặc định'}
                        </TableCell>
                      )}
                      <TableCell className="text-center tabular-nums">
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
              {/* Đọc lên mỗi khi đổi từ khoá hoặc bộ lọc, để người dùng trình đọc màn hình biết còn bao nhiêu người. */}
              <span role="status" aria-live="polite">
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
