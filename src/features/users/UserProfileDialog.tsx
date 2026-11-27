import { Check, Loader2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { EmploymentType, UserRole } from '@/features/auth/auth.types'
import { useMe } from '@/features/auth/use-auth'
import { shiftLabel, type Department } from '@/features/departments/departments.types'
import { getApiErrorMessage } from '@/lib/api-client'
import { EMPLOYMENT_LABEL, ROLE_LABEL, ROLE_OPTIONS, displayName } from '@/lib/user-display'
import { useUpdateUserProfile } from './use-users'
import type { UserProfile } from './users.types'

/** Radix Select không nhận giá trị rỗng. */
const NONE = 'none'

/** Mỗi vai trò được làm gì, hiện dưới ô chọn để admin chọn đúng. */
const ROLE_HINT: Record<UserRole, string> = {
  admin: 'Toàn quyền, kể cả sửa hồ sơ nhân sự và bộ phận.',
  manager: 'Vào các màn quản lý: chấm công, chốt công, tăng ca, duyệt đơn, feedback.',
  hr: 'Quyền như Quản lý.',
  leader: 'Hiện dùng các màn của nhân viên: công, đơn và feedback của mình.',
  staff: 'Xem công, đơn và feedback của mình.',
}

export function UserProfileDialog({
  user,
  departments,
  onClose,
}: {
  user: UserProfile
  departments: Department[]
  onClose: () => void
}) {
  const update = useUpdateUserProfile()
  const { data: me } = useMe()
  // Backend cũng chặn: tự đổi vai trò có thể làm hệ thống không còn admin nào.
  const isSelf = me?.id === user.id
  const [role, setRole] = useState<UserRole>(user.role)
  const [departmentId, setDepartmentId] = useState(user.department?.id ?? NONE)
  const [employmentType, setEmploymentType] = useState<EmploymentType>(user.employmentType)
  const [officeFloor, setOfficeFloor] = useState(user.officeFloor ? String(user.officeFloor) : NONE)
  const [contract, setContract] = useState(user.contractStartDate ?? '')
  const [error, setError] = useState('')

  const selected = departments.find((d) => d.id === departmentId)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setError('')
    update.mutate(
      {
        id: user.id,
        input: {
          role,
          departmentId: departmentId === NONE ? null : departmentId,
          employmentType,
          officeFloor: officeFloor === NONE ? null : (Number(officeFloor) as 4 | 5 | 6 | 7),
          contractStartDate: contract || null,
        },
      },
      { onSuccess: onClose, onError: (err) => setError(getApiErrorMessage(err)) },
    )
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{displayName(user)}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="user-role">Vai trò</FieldLabel>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)} disabled={isSelf}>
                <SelectTrigger id="user-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>{isSelf ? 'Không thể tự đổi vai trò của chính mình.' : ROLE_HINT[role]}</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="user-department">Bộ phận</FieldLabel>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger id="user-department" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Chưa gán bộ phận</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                {selected ? `Ca ${shiftLabel(selected)}` : 'Chưa gán bộ phận thì dùng giờ làm mặc định của hệ thống.'}
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="user-floor">Tầng chấm công</FieldLabel>
              <Select value={officeFloor} onValueChange={setOfficeFloor}>
                <SelectTrigger id="user-floor" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Chưa gán tầng</SelectItem>
                  <SelectItem value="4">Tầng 4</SelectItem>
                  <SelectItem value="5">Tầng 5</SelectItem>
                  <SelectItem value="6">Tầng 6</SelectItem>
                  <SelectItem value="7">Tầng 7</SelectItem>
                </SelectContent>
              </Select>
              <FieldDescription>
                Tầng 5 và 6 dùng chung nền văn phòng và Wi‑Fi. Tầng 4 và tầng 7 mỗi tầng một đồng hồ tường, không kiểm tra Wi‑Fi.
              </FieldDescription>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="user-type">Loại nhân sự</FieldLabel>
                <Select value={employmentType} onValueChange={(v) => setEmploymentType(v as EmploymentType)}>
                  <SelectTrigger id="user-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">{EMPLOYMENT_LABEL.full_time}</SelectItem>
                    <SelectItem value="part_time">{EMPLOYMENT_LABEL.part_time}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="user-contract">Ngày ký hợp đồng</FieldLabel>
                <Input
                  id="user-contract"
                  type="date"
                  min="2000-01-01"
                  max="2100-12-31"
                  value={contract}
                  onChange={(e) => setContract(e.target.value)}
                />
              </Field>
            </div>
            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={update.isPending}>
              Huỷ
            </Button>
            <Button type="submit" disabled={update.isPending}>
              {update.isPending ? <Loader2 className="animate-spin" /> : <Check />}
              Lưu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
