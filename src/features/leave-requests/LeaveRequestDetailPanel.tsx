import { AlertTriangle, ExternalLink, FileText, Loader2, Paperclip } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { getApiErrorMessage } from '@/lib/api-client'
import { formatDate, formatDateTime, formatHoursMinutes, formatTime } from '@/lib/format'
import { EMPLOYMENT_LABEL, ROLE_LABEL } from '@/lib/user-display'
import { cn } from '@/lib/utils'
import { LeaveStatusBadge, LeaveTypeIcon } from './LeaveRequestBadges'
import {
  OFFSITE_LABEL,
  ROUTE_ROLE_LABEL,
  SHIFT_LABEL,
  STATUS_LABEL,
  TYPE_META,
  allocationLabel,
  fileSizeLabel,
  formatNumber,
  routeLabel,
} from './leave-request-format'
import type { LeaveRequestDetail } from './leave-requests.types'
import { attachmentUrl, useLeaveRequestAction, useLeaveRequestDetail } from './use-leave-requests'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 py-2 text-sm sm:grid-cols-[8.5rem_minmax(0,1fr)]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}

function Box({ tone = 'muted', title, children }: { tone?: 'muted' | 'warn' | 'ok'; title: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'space-y-1.5 rounded-lg border px-3.5 py-3 text-sm',
        tone === 'muted' && 'bg-muted/40',
        tone === 'warn' && 'border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30',
        tone === 'ok' && 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30',
      )}
    >
      <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{title}</h4>
      {children}
    </div>
  )
}

/** Phép năm sẽ trừ / đã trừ và phép còn lại của năm đó, cho người duyệt cân nhắc. */
function LeaveBox({ detail }: { detail: LeaveRequestDetail }) {
  if (!detail.leavePlan) return null
  const deducted = detail.status === 'approved'
  return (
    <Box title={deducted ? 'Đã trừ phép năm' : 'Sẽ trừ phép năm khi duyệt'}>
      <ul className="space-y-0.5 tabular-nums">
        {detail.leavePlan.map((a) => (
          <li key={`${a.year}-${a.month}`}>{allocationLabel(a)}</li>
        ))}
      </ul>
      {detail.leaveBalances.map((b) => {
        if (!b.exists) {
          return (
            <p key={b.year} className="flex gap-1.5 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="mt-px size-3.5 shrink-0" />
              Chưa có phép năm {b.year}: thêm ở màn Phép năm trước khi duyệt.
            </p>
          )
        }
        const planned = detail.leavePlan!.filter((a) => a.year === b.year).reduce((n, a) => n + a.days, 0)
        const after = deducted ? b.remainingDays : b.remainingDays - planned
        return (
          <p key={b.year} className="text-xs text-muted-foreground tabular-nums">
            Phép năm {b.year}: có đến nay {formatNumber(b.accruedDays)}/{formatNumber(b.entitledDays)} ngày, đã nghỉ{' '}
            {formatNumber(b.usedDays)} ngày.{' '}
            <span className={cn('font-medium', after < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground')}>
              {deducted ? 'Còn' : 'Duyệt xong còn'} {formatNumber(after)} ngày
              {after < 0 ? ' (nghỉ quá phép có đến nay)' : ''}
            </span>
          </p>
        )
      })}
    </Box>
  )
}

/** Giờ chấm công thực tế của ca trong đơn đi muộn / về sớm. */
function AttendanceBox({ detail }: { detail: LeaveRequestDetail }) {
  if (detail.type !== 'late_arrival' && detail.type !== 'early_leave') return null
  const a = detail.attendance
  const title = `Chấm công ${SHIFT_LABEL[detail.startShift].toLowerCase()} ${formatDate(detail.startDate)}`
  if (!a) {
    return (
      <Box title={title}>
        <p className="text-xs text-muted-foreground">Ngày này chưa có chấm công.</p>
      </Box>
    )
  }
  const late = a.lateMinutes ?? 0
  const counted = a.countedLateMinutes ?? 0
  const { excusedLateMinutes: excused, excuseQuota: quota, excuseQuotaLeft: left } = a
  let verdict: string
  if (counted === 0) {
    verdict = `không tính là đi muộn, trừ ${formatHoursMinutes(excused)} vào quỹ ${quota} phút có phép của tháng (còn ${left - excused} phút)`
  } else if (excused > 0) {
    verdict = `miễn ${formatHoursMinutes(excused)} còn lại của quỹ ${quota} phút có phép trong tháng, vẫn tính muộn ${formatHoursMinutes(counted)}`
  } else {
    verdict = `vẫn tính muộn ${formatHoursMinutes(counted)} vì đã dùng hết ${quota} phút đi muộn có phép của tháng`
  }
  return (
    <Box title={title}>
      <p className="tabular-nums">
        Vào {formatTime(a.inAt)} · Ra {formatTime(a.outAt)}
      </p>
      {detail.type === 'late_arrival' ? (
        late > 0 ? (
          <p className="text-xs text-muted-foreground">
            Muộn {formatHoursMinutes(late)}.{' '}
            <span className="font-medium text-foreground">
              {detail.status === 'approved' ? 'Đã duyệt: ' : 'Nếu duyệt: '}
              {verdict}
            </span>
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Không đi muộn ca này.</p>
        )
      ) : (
        <p className="text-xs text-muted-foreground">
          {(a.earlyMinutes ?? 0) > 0 ? `Về sớm ${formatHoursMinutes(a.earlyMinutes!)}.` : 'Không về sớm ca này.'}
        </p>
      )}
    </Box>
  )
}

/** Đệm của panel trong sheet; thanh nút dính đáy kéo ra sát mép bằng lề âm cùng cỡ. */
const SHEET_PAD = 'p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]'
/** Thanh thao tác ở đáy sheet (vùng ngón cái): đơn ngắn thì đẩy xuống đáy, đơn dài thì dính đáy khi cuộn. */
const STICKY_FOOTER =
  'sticky bottom-0 mt-auto z-10 -mx-4 -mb-[calc(1rem+env(safe-area-inset-bottom))] bg-popover px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-6px_12px_-8px_rgb(0_0_0/0.15)]'

/** Màn rộng: chi tiết dài hơn cột thì thanh nút dính đáy thẻ khi cuộn trong cột. */
const CARD_FOOTER = 'sticky bottom-0 z-10 -mx-5 -mb-5 rounded-b-xl bg-card px-5 pb-5'

/** Ô nhập ghi chú + nút duyệt / từ chối cho admin, quản lý. Đơn đã duyệt thì nút từ chối là "Huỷ duyệt". */
function ReviewForm({
  detail,
  variant,
  onDone,
}: {
  detail: LeaveRequestDetail
  variant: 'card' | 'sheet'
  onDone?: () => void
}) {
  const action = useLeaveRequestAction()
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const pending = action.isPending

  async function run(kind: 'approve' | 'reject') {
    if (kind === 'reject' && !note.trim()) {
      setError('Nhập lý do để nhân sự biết vì sao đơn không được duyệt')
      return
    }
    setError(null)
    try {
      await action.mutateAsync({ id: detail.id, action: kind, note })
      setNote('')
      onDone?.()
    } catch {
      // Lỗi (vd chưa có phép năm) đã hiện qua toast của hook.
    }
  }

  return (
    <div className={cn('space-y-2 border-t pt-4', variant === 'sheet' ? STICKY_FOOTER : CARD_FOOTER)}>
      <label htmlFor="lr-review-note" className="text-xs font-medium">
        Ghi chú cho nhân sự <span className="font-normal text-muted-foreground">(bắt buộc khi từ chối)</span>
      </label>
      <Textarea
        id="lr-review-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={1000}
        rows={2}
        className="resize-y"
        placeholder={detail.status === 'approved' ? 'Lý do huỷ duyệt' : 'Ví dụ: Đồng ý, nhớ bàn giao đầy đủ'}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      {/* Điện thoại: hai nút chia đôi hàng cho dễ bấm. */}
      <div className="flex flex-wrap justify-end gap-2 *:flex-1 sm:*:flex-none">
        {detail.canReject && (
          <Button variant="outline" onClick={() => void run('reject')} disabled={pending}>
            {pending && action.variables?.action === 'reject' && <Loader2 className="animate-spin" />}
            {detail.status === 'approved' ? 'Huỷ duyệt' : 'Từ chối'}
          </Button>
        )}
        {detail.canApprove && (
          <Button onClick={() => void run('approve')} disabled={pending}>
            {pending && action.variables?.action === 'approve' && <Loader2 className="animate-spin" />}
            {detail.status === 'rejected' ? 'Duyệt lại' : 'Duyệt đơn'}
          </Button>
        )}
      </div>
    </div>
  )
}

/**
 * Chi tiết một đơn: thông tin form, phép năm / chấm công liên quan, kết quả duyệt và các thao tác được phép.
 * `card` = khung thẻ ở cột phải màn rộng; `sheet` = nằm trong sheet ở màn hẹp (sheet lo khung, chừa chỗ nút đóng).
 */
export function LeaveRequestDetailPanel({
  id,
  showUser = false,
  variant = 'card',
  onDone,
}: {
  id: string | null
  showUser?: boolean
  variant?: 'card' | 'sheet'
  /** Gọi sau khi duyệt / từ chối / rút đơn thành công (sheet dùng để tự đóng). */
  onDone?: () => void
}) {
  const { data: detail, isPending, isError, error } = useLeaveRequestDetail(id)
  const action = useLeaveRequestAction()
  const [confirmCancel, setConfirmCancel] = useState(false)
  const card = variant === 'card'

  if (!id) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-dashed bg-card/40 p-8 text-center">
        <FileText className="mb-3 size-10 text-muted-foreground/40" />
        <p className="text-sm font-medium">Chưa chọn đơn</p>
        <p className="mt-1 text-xs text-muted-foreground">Chọn một đơn ở danh sách để xem chi tiết.</p>
      </div>
    )
  }
  if (isError && !detail) {
    return (
      <div
        className={cn(
          'flex min-h-[320px] items-center justify-center p-8 text-center text-sm text-destructive',
          card && 'rounded-xl border bg-card',
        )}
      >
        {getApiErrorMessage(error)}
      </div>
    )
  }
  if (isPending || !detail) {
    return (
      <div className={cn('flex min-h-[320px] items-center justify-center p-8', card && 'rounded-xl border bg-card')}>
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const meta = TYPE_META[detail.type]
  const reviewed = detail.status === 'approved' || detail.status === 'rejected'
  const canReview = detail.canApprove || detail.canReject

  return (
    <div className={cn('flex flex-col gap-4', card ? 'rounded-xl border bg-card p-5 shadow-xs' : cn(SHEET_PAD, 'flex-1'))}>
      <div className={cn('flex flex-wrap items-start justify-between gap-3 border-b pb-4', !card && 'pr-10')}>
        <div className="flex min-w-0 items-center gap-3">
          <LeaveTypeIcon type={detail.type} className="size-10" />
          <div className="min-w-0">
            <h3 className={cn('text-base font-semibold', card && 'truncate')}>
              {showUser ? `${detail.user.name} · ${meta.label}` : `Đơn ${meta.label.toLowerCase()}`}
            </h3>
            <p className={cn('text-xs text-muted-foreground', card && 'truncate')}>
              {showUser
                ? `${detail.user.department?.name ?? 'Chưa có bộ phận'} · ${EMPLOYMENT_LABEL[detail.user.employmentType]} · `
                : ''}
              Gửi {formatDateTime(detail.createdAt)}
            </p>
          </div>
        </div>
        <LeaveStatusBadge status={detail.status} />
      </div>

      <dl className="divide-y">
        <Row label={detail.type === 'leave' ? 'Nghỉ từ' : 'Thời gian'}>
          <span className="tabular-nums">
            {detail.startTime} · {formatDate(detail.startDate)}
          </span>
          {detail.type !== 'leave' && detail.type !== 'offsite' && (
            <span className="text-muted-foreground"> · {SHIFT_LABEL[detail.startShift].toLowerCase()}</span>
          )}
        </Row>
        {detail.type === 'leave' && (
          <>
            <Row label="Số ngày nghỉ">
              {formatNumber(detail.leaveDays ?? 0)} ngày ·{' '}
              {detail.deductAnnualLeave ? 'hưởng lương, trừ phép năm' : 'không lương, không trừ phép năm'}
            </Row>
            <Row label="Bàn giao cho">{detail.handover}</Row>
          </>
        )}
        {(detail.type === 'late_arrival' || detail.type === 'early_leave') && (
          <Row label="Số giờ xin phép">{formatNumber(detail.hours ?? 0)} giờ</Row>
        )}
        {detail.type === 'offsite' && detail.offsiteKind && <Row label="Hình thức">{OFFSITE_LABEL[detail.offsiteKind]}</Row>}
        <Row label="Lý do">
          <span className="whitespace-pre-wrap">{detail.reason}</span>
        </Row>
        {routeLabel(detail) && (
          <Row label="Gửi duyệt">
            {routeLabel(detail)}
            {detail.routedTo && ROUTE_ROLE_LABEL[detail.routedTo] && (
              <span className="text-muted-foreground"> · {ROUTE_ROLE_LABEL[detail.routedTo]}</span>
            )}
            {/* Vì sao đơn không tới trưởng nhóm phụ trách (chưa chọn, chưa có quyền duyệt…), để người duyệt và người gửi biết. */}
            {detail.routeNote && <span className="block text-xs text-muted-foreground">{detail.routeNote}</span>}
          </Row>
        )}
        {detail.approver && (
          <Row label="Người duyệt">{`${detail.approver.name} (${ROLE_LABEL[detail.approver.role]})`}</Row>
        )}
        {detail.attachments.length > 0 && (
          <Row label="Xác nhận">
            <ul className="space-y-1">
              {detail.attachments.map((f) => (
                <li key={f.id}>
                  <a
                    href={attachmentUrl(detail.id, f.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-1.5 text-primary hover:underline"
                  >
                    <Paperclip className="size-3.5 shrink-0" />
                    <span className="truncate">{f.fileName}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{fileSizeLabel(f.sizeBytes)}</span>
                    <ExternalLink className="size-3 shrink-0" />
                  </a>
                </li>
              ))}
            </ul>
          </Row>
        )}
      </dl>

      <LeaveBox detail={detail} />
      <AttendanceBox detail={detail} />

      {reviewed && (
        <Box tone={detail.status === 'approved' ? 'ok' : 'warn'} title={STATUS_LABEL[detail.status]}>
          <p className="text-xs text-muted-foreground">
            {detail.reviewedBy?.name ?? 'Quản lý'}
            {detail.reviewedAt ? ` · ${formatDateTime(detail.reviewedAt)}` : ''}
          </p>
          {detail.reviewNote && <p className="whitespace-pre-wrap">{detail.reviewNote}</p>}
        </Box>
      )}

      {canReview && <ReviewForm key={detail.id} detail={detail} variant={variant} onDone={onDone} />}

      {detail.canCancel && (
        <div className={cn('flex justify-end border-t pt-4 *:flex-1 sm:*:flex-none', !card && !canReview && STICKY_FOOTER)}>
          <Button variant="outline" onClick={() => setConfirmCancel(true)}>
            Rút đơn
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmCancel}
        title="Rút đơn xin phép?"
        description="Đơn chuyển sang Đã rút và quản lý không duyệt được nữa. Muốn xin lại thì tạo đơn mới."
        confirmLabel="Rút đơn"
        pending={action.isPending}
        onCancel={() => setConfirmCancel(false)}
        onConfirm={() => {
          action.mutate(
            { id: detail.id, action: 'cancel' },
            { onSuccess: () => onDone?.(), onSettled: () => setConfirmCancel(false) },
          )
        }}
      />
    </div>
  )
}
