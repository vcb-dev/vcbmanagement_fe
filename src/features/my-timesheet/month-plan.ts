import { formatDateTime, todayYmd } from '@/lib/format'
import type { MyTimesheet } from './my-timesheet.types'

export type Tone = 'neutral' | 'ok' | 'issue' | 'live'

/** Nhãn trạng thái ở góc thẻ. `wait` = đang chờ ai đó làm gì (bạn xác nhận, hoặc số liệu còn chạy). */
export type BadgeTone = 'neutral' | 'ok' | 'issue' | 'wait'

/**
 * Việc nhân sự làm được với công tháng này lúc này. Là nguồn duy nhất cho cả nhãn trạng thái ở góc thẻ
 * lẫn khối xác nhận, để hai chỗ không bao giờ nói khác nhau.
 */
export interface Plan {
  badge: { label: string; tone: BadgeTone }
  tone: Tone
  title: string
  body?: string
  /** Đang trong kỳ xác nhận: nút xác nhận là thao tác chính của trang. */
  confirm: 'full_time' | 'part_time' | null
  dispute: { sheetId: string; sheetType: 'full_time' | 'part_time'; label: string } | null
  outdated?: boolean
}

const CONFIRMED = { label: 'Đã xác nhận', tone: 'ok' } as const
const DISPUTED = { label: 'Đang báo sai', tone: 'issue' } as const
const AWAITING = { label: 'Chờ bạn xác nhận', tone: 'wait' } as const

export function planOf(data: MyTimesheet): Plan {
  const { fullTime, confirmation, sheet } = data
  const running = data.month >= todayYmd().slice(0, 7)

  if (fullTime) {
    const canDispute = !!sheet && (sheet.status === 'pending' || sheet.status === 'disputed')
    const dispute = canDispute ? { sheetId: sheet!.id, sheetType: 'full_time' as const, label: 'Báo sai' } : null
    if (!confirmation) {
      return running
        ? {
            badge: { label: 'Đang cập nhật', tone: 'wait' },
            tone: 'live',
            title: 'Tháng đang chạy',
            body: 'Số liệu còn thay đổi theo chấm công mỗi ngày.',
            confirm: null,
            dispute,
          }
        : {
            badge: { label: 'Tháng đã qua', tone: 'neutral' },
            tone: 'neutral',
            title: 'Tháng đã qua',
            body: 'Tháng này không có bản chốt để xác nhận.',
            confirm: null,
            dispute,
          }
    }
    if (confirmation.status === 'confirmed') {
      return {
        badge: CONFIRMED,
        tone: 'ok',
        title: `Bạn đã xác nhận lúc ${formatDateTime(confirmation.confirmedAt!)}`,
        body: 'Nếu quản lý sửa số liệu sau đó, bạn sẽ cần xác nhận lại.',
        confirm: null,
        dispute: null,
      }
    }
    if (confirmation.status === 'disputed') {
      return {
        badge: DISPUTED,
        tone: 'issue',
        title: 'Bạn đã báo sai, quản lý đang kiểm tra',
        body: 'Quản lý sửa xong thì bạn xác nhận lại. Trao đổi nằm ở mục bên dưới.',
        confirm: null,
        dispute: dispute && { ...dispute, label: 'Báo thêm' },
      }
    }
    if (!confirmation.canConfirm) {
      return {
        badge: { label: running ? 'Tháng đang chạy' : 'Chưa tới kỳ xác nhận', tone: 'neutral' },
        tone: 'neutral',
        title: 'Chưa tới kỳ xác nhận',
        body: confirmation.reason ?? 'Xác nhận được khi hết tháng.',
        confirm: null,
        dispute,
      }
    }
    return {
      badge: AWAITING,
      tone: 'live',
      title: 'Kiểm tra và xác nhận công tháng',
      body: 'Số liệu đúng thì xác nhận; chưa đúng thì báo sai để quản lý sửa.',
      confirm: 'full_time',
      dispute,
    }
  }

  // Part-time
  if (!sheet) {
    return {
      badge: { label: 'Tạm tính', tone: 'wait' },
      tone: 'live',
      title: 'Tạm tính, chưa chốt công',
      body: 'Quản lý chốt công xong thì bạn xác nhận tại đây.',
      confirm: null,
      dispute: null,
    }
  }
  const sheetType = data.profile.employmentType === 'part_time' ? 'part_time' : 'full_time'
  const { live, partTime } = data
  const outdated =
    live != null &&
    partTime != null &&
    (live.offlineHours.toFixed(2) !== partTime.offlineHours.toFixed(2) ||
      live.onlineHours.toFixed(2) !== partTime.onlineHours.toFixed(2) ||
      live.lateCount !== data.attendance.lateCount ||
      live.missingPunchCount !== data.attendance.missingPunchCount)

  if (sheet.status === 'confirmed') {
    return {
      badge: CONFIRMED,
      tone: 'ok',
      title: 'Bạn đã xác nhận bản chốt công',
      body: 'Cần điều chỉnh thêm thì báo trực tiếp với quản lý.',
      confirm: null,
      dispute: null,
      outdated,
    }
  }
  const dispute = { sheetId: sheet.id, sheetType, label: sheet.status === 'disputed' ? 'Báo thêm' : 'Báo sai' } as const
  if (sheet.status === 'disputed') {
    return {
      badge: DISPUTED,
      tone: 'issue',
      title: 'Bạn đã báo sai, quản lý đang kiểm tra',
      body: 'Trao đổi nằm ở mục bên dưới.',
      confirm: null,
      dispute,
      outdated,
    }
  }
  return {
    badge: AWAITING,
    tone: 'live',
    title: 'Quản lý đã chốt công, mời bạn kiểm tra',
    body: 'Số liệu đúng thì xác nhận; chưa đúng thì báo sai để quản lý sửa.',
    confirm: sheetType === 'part_time' ? 'part_time' : null,
    dispute,
    outdated,
  }
}

/** Trang có thanh hành động dính ở đáy trên điện thoại không, để chừa chỗ cho nó. */
export function hasStickyActions(data: MyTimesheet): boolean {
  return planOf(data).confirm != null
}
