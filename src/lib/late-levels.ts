/**
 * Khoảng phút của mốc thứ `level` (từ 1) trong bộ mốc tăng dần.
 * Vd bộ mốc [15, 60]: mốc 1 là "1–15 phút", mốc 2 là "16–60 phút", mốc 3 là "trên 60 phút".
 */
export function lateLevelRange(level: number, thresholds: readonly number[]): string {
  const to = thresholds[level - 1]
  if (to === undefined) return `trên ${thresholds[thresholds.length - 1]} phút`
  const from = (level === 1 ? 0 : thresholds[level - 2]) + 1
  return from === to ? `${to} phút` : `${from}–${to} phút`
}

/** Tên mốc khi đứng một mình, vd ở đầu cột: "1–15 phút", "Trên 60 phút". */
export function lateLevelName(level: number, thresholds: readonly number[]): string {
  const range = lateLevelRange(level, thresholds)
  return range.charAt(0).toUpperCase() + range.slice(1)
}

/** "Mốc 2 · 16–60 phút", hoặc chỉ "Mốc 2" khi chưa có bộ mốc để tính khoảng. */
export function lateLevelLabel(level: number, thresholds: readonly number[]): string {
  return thresholds.length ? `Mốc ${level} · ${lateLevelRange(level, thresholds)}` : `Mốc ${level}`
}

export type LateSeverity = 'low' | 'mid' | 'high'

export const LATE_SEVERITIES: LateSeverity[] = ['low', 'mid', 'high']

export const LATE_SEVERITY_LABEL: Record<LateSeverity, string> = {
  low: 'Muộn ít',
  mid: 'Muộn vừa',
  high: 'Muộn nhiều',
}

const SEVERITY_STYLE: Record<LateSeverity, { bg: string; text: string; dot: string }> = {
  low: { bg: 'bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  mid: { bg: 'bg-amber-500/10', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  high: { bg: 'bg-rose-500/10', text: 'text-rose-700 dark:text-rose-400', dot: 'bg-rose-500' },
}

/** Độ nặng theo vị trí trong bộ mốc: mốc đầu là ít, mốc cuối là nhiều, các mốc giữa là vừa. `thresholds` có n mốc thì có n + 1 mức. */
export function lateSeverity(level: number, thresholds: readonly number[]): LateSeverity {
  if (level <= 1) return 'low'
  return level > thresholds.length ? 'high' : 'mid'
}

export function lateSeverityDot(severity: LateSeverity): string {
  return SEVERITY_STYLE[severity].dot
}

export function lateLevelTone(level: number, thresholds: readonly number[]): string {
  const { bg, text } = SEVERITY_STYLE[lateSeverity(level, thresholds)]
  return `${bg} ${text}`
}

export function lateLevelText(level: number, thresholds: readonly number[]): string {
  return SEVERITY_STYLE[lateSeverity(level, thresholds)].text
}
