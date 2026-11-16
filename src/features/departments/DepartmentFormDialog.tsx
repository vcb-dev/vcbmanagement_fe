import { Check, Loader2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { getApiErrorMessage } from '@/lib/api-client'
import { eveningOrderValid, shiftOrderValid, type Department, type DepartmentInput, type ShiftTimes } from './departments.types'
import { useSaveDepartment } from './use-departments'

const EMPTY: DepartmentInput = {
  name: '',
  morningStart: '08:30',
  morningEnd: '11:45',
  afternoonStart: '13:20',
  afternoonEnd: '17:50',
  eveningStart: null,
  eveningEnd: null,
}

const TIME_FIELDS: { key: keyof ShiftTimes; label: string }[] = [
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
          eveningStart: department.eveningStart,
          eveningEnd: department.eveningEnd,
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
    const eveningErr = eveningOrderValid(form.afternoonEnd, form.eveningStart, form.eveningEnd)
    if (eveningErr) return setError(eveningErr)
    setError('')
    const eveningStart = form.eveningStart?.trim() || null
    const eveningEnd = form.eveningEnd?.trim() || null
    save.mutate(
      { id: department?.id, input: { ...form, name, eveningStart, eveningEnd } },
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
              {TIME_FIELDS.map(({ key }) => (
                <Field key={key}>
                  <FieldLabel htmlFor={`dept-${key}`}>{TIME_FIELDS.find((f) => f.key === key)?.label}</FieldLabel>
                  <Input
                    id={`dept-${key}`}
                    type="time"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </Field>
              ))}
            </div>
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="dept-eveningStart">Vào ca tối</FieldLabel>
                  <Input
                    id="dept-eveningStart"
                    type="time"
                    value={form.eveningStart ?? ''}
                    onChange={(e) => setForm({ ...form, eveningStart: e.target.value || null })}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="dept-eveningEnd">Ra ca tối</FieldLabel>
                  <Input
                    id="dept-eveningEnd"
                    type="time"
                    value={form.eveningEnd ?? ''}
                    onChange={(e) => setForm({ ...form, eveningEnd: e.target.value || null })}
                  />
                </Field>
              </div>
              <p className="text-xs text-muted-foreground">
                Chỉ dùng cho part-time. Để trống nếu bộ phận không có ca tối.
              </p>
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
