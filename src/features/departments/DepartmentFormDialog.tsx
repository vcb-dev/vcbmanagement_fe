import { Check, Loader2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { getApiErrorMessage } from '@/lib/api-client'
import { shiftOrderValid, type Department, type DepartmentInput } from './departments.types'
import { useSaveDepartment } from './use-departments'

const EMPTY: DepartmentInput = {
  name: '',
  morningStart: '08:30',
  morningEnd: '11:45',
  afternoonStart: '13:20',
  afternoonEnd: '17:50',
}

const TIME_FIELDS: { key: keyof Omit<DepartmentInput, 'name'>; label: string }[] = [
  { key: 'morningStart', label: 'Vào ca sáng' },
  { key: 'morningEnd', label: 'Ra ca sáng' },
  { key: 'afternoonStart', label: 'Vào ca chiều' },
  { key: 'afternoonEnd', label: 'Ra ca chiều' },
]

/** Bọc ở nơi dùng bằng `key` để form luôn bắt đầu từ dữ liệu của bộ phận đang mở. */
export function DepartmentFormDialog({ department, onClose }: { department: Department | null; onClose: () => void }) {
  const save = useSaveDepartment()
  const [form, setForm] = useState<DepartmentInput>(() =>
    department
      ? {
          name: department.name,
          morningStart: department.morningStart,
          morningEnd: department.morningEnd,
          afternoonStart: department.afternoonStart,
          afternoonEnd: department.afternoonEnd,
        }
      : EMPTY,
  )
  const [error, setError] = useState('')

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const name = form.name.trim().replace(/\s+/g, ' ')
    if (!name) return setError('Nhập tên bộ phận.')
    if (TIME_FIELDS.some(({ key }) => !form[key])) return setError('Nhập đủ 4 mốc giờ.')
    if (!shiftOrderValid(form)) return setError('Giờ phải theo thứ tự: vào sáng < ra sáng ≤ vào chiều < ra chiều.')
    setError('')
    save.mutate(
      { id: department?.id, input: { ...form, name } },
      { onSuccess: onClose, onError: (err) => setError(getApiErrorMessage(err)) },
    )
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{department ? 'Sửa bộ phận' : 'Thêm bộ phận'}</DialogTitle>
          <DialogDescription>
            Giờ ca dùng để tính đi muộn, về sớm cho nhân sự thuộc bộ phận. Đổi giờ chỉ áp dụng từ lần chấm công sau, công đã
            chấm giữ nguyên.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="dept-name">Tên bộ phận</FieldLabel>
              <Input
                id="dept-name"
                value={form.name}
                maxLength={60}
                autoComplete="off"
                placeholder="Ví dụ: Kinh doanh Online"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              {TIME_FIELDS.map(({ key, label }) => (
                <Field key={key}>
                  <FieldLabel htmlFor={`dept-${key}`}>{label}</FieldLabel>
                  <Input
                    id={`dept-${key}`}
                    type="time"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </Field>
              ))}
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
