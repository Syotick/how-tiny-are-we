/** 尺寸格式化：科学计数法、可读单位、与人类的对比 */

export const HUMAN = 1.7 // 人类平均身高（米），全站基准

const SUP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
  '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻', '.': '·',
}

export function toSuperscript(x: string | number): string {
  return String(x)
    .split('')
    .map((c) => SUP[c] ?? c)
    .join('')
}

function trim(x: number): string {
  const v = Math.round(x * 100) / 100
  return v.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

/** 中文数字分组：1.06万 / 930亿 / 105722 → 10.57万 */
export function groupNum(x: number): string {
  if (!Number.isFinite(x)) return '∞'
  const neg = x < 0 ? '-' : ''
  const ax = Math.abs(x)
  if (ax >= 1e8) return `${neg}${trim(ax / 1e8)}亿`
  if (ax >= 1e4) return `${neg}${trim(ax / 1e4)}万`
  return `${neg}${trim(ax)}`
}

/** 科学计数法，如 "1.62 × 10⁻³⁵ 米" */
export function sciNotation(x: number, digits = 2): string {
  if (x === 0) return '0 米'
  const exp = Math.floor(Math.log10(Math.abs(x)))
  const mant = x / 10 ** exp
  const m = mant.toFixed(digits).replace(/\.?0+$/, '')
  return `${m} × 10${toSuperscript(exp)} 米`
}

interface Band {
  min: number
  unit: string
  factor: number
  group: boolean
}

const BANDS: Band[] = [
  { min: 9.4607304725808e25, unit: '亿光年', factor: 9.4607304725808e23, group: false },
  { min: 9.4607304725808e19, unit: '光年', factor: 9.4607304725808e15, group: true },
  { min: 1.495978707e11, unit: '天文单位', factor: 1.495978707e11, group: false },
  { min: 1e9, unit: '万公里', factor: 1e7, group: false },
  { min: 1e6, unit: '公里', factor: 1e3, group: false },
  { min: 1, unit: '米', factor: 1, group: false },
  { min: 1e-3, unit: '毫米', factor: 1e-3, group: false },
  { min: 1e-6, unit: '微米', factor: 1e-6, group: false },
  { min: 1e-9, unit: '纳米', factor: 1e-9, group: false },
  { min: 1e-12, unit: '皮米', factor: 1e-12, group: false },
  { min: 1e-15, unit: '飞米', factor: 1e-15, group: false },
  { min: -Infinity, unit: '米', factor: 1, group: false },
]

/** 可读单位，如 "930 亿光年" / "139 万公里" / "7.5 微米" */
export function formatReadable(size: number): string {
  for (const b of BANDS) {
    if (size >= b.min) {
      const v = size / b.factor
      return `${b.group ? groupNum(v) : trim(v)} ${b.unit}`
    }
  }
  return sciNotation(size)
}

/** 与人类的对比，如 "≈ 8.8×10²⁵ 个你首尾相接" / "你大约是它的 1000 倍" */
export function humanCompare(size: number): string {
  if (!Number.isFinite(size)) return '∞ 倍于你——无法想象'
  const n = size / HUMAN
  if (n < 1) {
    const t = HUMAN / size
    if (t >= 1e9) return `你大约是它的 ${sciNotation(t, 2).replace(' 米', '')} 倍`
    return `你大约是它的 ${groupNum(t)} 倍`
  }
  if (n >= 1e9) {
    return `≈ 10${toSuperscript(Math.log10(n).toFixed(1))} 个你首尾相接`
  }
  if (n >= 1e4) return `≈ ${groupNum(n)} 个你首尾相接`
  return `≈ ${groupNum(n)} 个你叠起来`
}

/** 便于排序/定位的对数尺度（null → 无穷大顶端） */
export function logOf(size: number | null, topLog: number): number {
  if (size == null) return topLog
  return Math.log10(size)
}
