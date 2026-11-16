import { Check, Loader2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { EmploymentType } from '@/features/auth/auth.types'
import { getApiErrorMessage } from '@/lib/api-client'
import { EMPLOYMENT_LABEL } from '@/lib/user-display'
import type { Department, LateThreshold } from './departments.types'
import { useSaveLateThreshold } from './use-departments'

/** Radix Select không nhận giá trị rỗng nên dùng giá trị riêng cho "tất cả". */
const ALL = 'all'
const MAX_MINUTES = 240

export interface ThresholdTarget {
  departmentId: string | null
  employmentType: EmploymentType | null
}

export function LateThresholdFormDialog({
  threshold,
  target,
  departments,
  onClose,
}: {
  threshold: LateThreshold | null
  /** Đối tượng điền sẵn khi thêm mốc vào một bộ mốc đã có. */
  target?: ThresholdTarget
  departments: Department[]
  onClose: () => void
}) {
  const save = useSaveLateThreshold()
  const source = threshold ?? target
  const [minutes, setMinutes] = useState(threshold ? String(threshold.thresholdMinutes) : '')
  const [departmentId, setDepartmentId] = useState(source?.departmentId ?? ALL)
  const [employmentType, setEmploymentType] = useState<string>(source?.employmentType ?? ALL)
  const [error, setError] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const value = Number(minutes)
    if (minutes.trim() === '' || !Number.isInteger(value) || value < 1 || value > MAX_MINUTES) {
      return setError(`Mốc phải là số phút nguyên từ 1 đến ${MAX_MINUTES}.`)
    }
    setError('')
    save.mutate(
      {
        id: threshold?.id,
        input: {
          thresholdMinutes: value,
          departmentId: departmentId === ALL ? null : departmentId,
          employmentType: employmentType === ALL ? null : (employmentType as EmploymentType),
        },
      },
      { onSuccess: onClose, onError: (err) => setError(getApiErrorMessage(err)) },
    )
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{threshold ? 'Sửa mốc đi muộn' : 'Thêm mốc đi muộn'}</DialogTitle>
          <DialogDescription>
            Mốc dùng để xếp một lần đi muộn theo số phút muộn. Ví dụ bộ mốc 15 và 60: muộn đến 15 phút là Mốc 1, đến 60 phút là
            Mốc 2, trên 60 phút là Mốc 3. Thay đổi có hiệu lực từ tháng hiện tại, các tháng trước giữ nguyên.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="threshold-minutes">Muộn đến (phút)</FieldLabel>
              <Input
                id="threshold-minutes"
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_MINUTES}
                step={1}
                placeholder="Ví dụ: 15"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
              <FieldDescription>Thứ tự mốc tự sắp xếp theo số phút.</FieldDescription>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="threshold-department">Bộ phận</FieldLabel>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger id="threshold-department" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Mọi bộ phận</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="threshold-type">Loại nhân sự</FieldLabel>
                <Select value={employmentType} onValueChange={setEmploymentType}>
                  <SelectTrigger id="threshold-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Mọi loại nhân sự</SelectItem>
                    <SelectItem value="full_time">{EMPLOYMENT_LABEL.full_time}</SelectItem>
                    <SelectItem value="part_time">{EMPLOYMENT_LABEL.part_time}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={save.isPending}>
              Huỷ
            </Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="animate-spin" /> : <Check />}
              Lưu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
