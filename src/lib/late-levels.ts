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

/** Khoảng phút viết gọn cho nhãn nhỏ, cùng kiểu số phút muộn trên lịch: "1–15'", "16–60'", ">60'". */
export function lateLevelShort(level: number, thresholds: readonly number[]): string {
  const to = thresholds[level - 1]
  if (to === undefined) return `>${thresholds[thresholds.length - 1]}'`
  const from = (level === 1 ? 0 : thresholds[level - 2]) + 1
  return from === to ? `${to}'` : `${from}–${to}'`
}

/** "Mốc 2 · 16–60 phút", hoặc chỉ "Mốc 2" khi chưa có bộ mốc để tính khoảng. */
export function lateLevelLabel(level: number, thresholds: readonly number[]): string {
  return thresholds.length ? `Mốc ${level} · ${lateLevelRange(level, thresholds)}` : `Mốc ${level}`
}

type LateSeverity = 'low' | 'mid' | 'high'

const SEVERITY_TONE: Record<LateSeverity, string> = {
  low: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  mid: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  high: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
}

/** Độ nặng theo vị trí trong bộ mốc: mốc đầu là ít, mốc cuối là nhiều, các mốc giữa là vừa. `thresholds` có n mốc thì có n + 1 mức. */
function lateSeverity(level: number, thresholds: readonly number[]): LateSeverity {
  if (level <= 1) return 'low'
  return level > thresholds.length ? 'high' : 'mid'
}

export function lateLevelTone(level: number, thresholds: readonly number[]): string {
  return SEVERITY_TONE[lateSeverity(level, thresholds)]
}
