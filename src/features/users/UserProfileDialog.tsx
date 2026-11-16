import { Check, Loader2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { EmploymentType } from '@/features/auth/auth.types'
import { shiftLabel, type Department } from '@/features/departments/departments.types'
import { getApiErrorMessage } from '@/lib/api-client'
import { EMPLOYMENT_LABEL, displayName } from '@/lib/user-display'
import { useUpdateUserProfile } from './use-users'
import type { UserProfile } from './users.types'

/** Radix Select không nhận giá trị rỗng. */
const NONE = 'none'

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
  const [departmentId, setDepartmentId] = useState(user.department?.id ?? NONE)
  const [employmentType, setEmploymentType] = useState<EmploymentType>(user.employmentType)
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
          departmentId: departmentId === NONE ? null : departmentId,
          employmentType,
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
