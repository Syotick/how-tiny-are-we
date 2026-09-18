import { useCallback } from 'react'

interface RulerProps {
  minLog: number
  maxLog: number
  pos: number
  humanLog: number
  onJump: (log: number) => void
}

/** 左侧对数标尺：大在上、小在下；点击任意位置跳转 */
export default function Ruler({ minLog, maxLog, pos, humanLog, onJump }: RulerProps) {
  const map = useCallback(
    (log: number) => {
      const span = maxLog - minLog || 1
      return ((maxLog - log) / span) * 100 // 百分比（自上而下）
    },
    [minLog, maxLog]
  )

  const onPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientY - rect.top) / rect.height
    const log = maxLog - ratio * (maxLog - minLog)
    onJump(Math.min(maxLog, Math.max(minLog, log)))
  }

  const ticks: { n: number; y: number; major: boolean }[] = []
  for (let n = Math.ceil(minLog); n <= Math.floor(maxLog); n++) {
    ticks.push({ n, y: map(n), major: n % 5 === 0 })
  }

  const sup = (n: number) => (n < 0 ? '⁻' + String(-n) : String(n))

  return (
    <div
      className="ruler"
      onPointerDown={onPointer}
      style={{ position: 'relative', touchAction: 'none' }}
    >
      {ticks.map((t) => (
        <div
          key={t.n}
          className={`ruler-tick ${t.major ? 'major' : ''}`}
          style={{ top: `${t.y}%` }}
        >
          {t.major ? `10${sup(t.n)}` : ''}
        </div>
      ))}

      {/* 人类基准标记 */}
      <div className="ruler-human" style={{ top: `${map(humanLog)}%` }} title="人类（1.7 米）基准">
        <span className="ruler-human-emoji">🧍</span>
        <span className="ruler-human-label">人类 1.7m</span>
      </div>

      {/* 当前位置标记 */}
      <div className="ruler-pos" style={{ top: `${map(pos)}%` }}>
        <div className="ruler-pos-tri" />
        <div className="ruler-pos-dot" />
      </div>
    </div>
  )
}
