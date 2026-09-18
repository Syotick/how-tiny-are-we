interface JumpBarProps {
  jumps: { id: string; label: string; emoji: string }[]
  onJump: (id: string) => void
  halfRange: number
  onZoom: (delta: number) => void
}

export default function JumpBar({ jumps, onJump, halfRange, onZoom }: JumpBarProps) {
  return (
    <footer className="jumpbar">
      <div className="jump-group">
        {jumps.map((j) => (
          <button key={j.id} className="jump-btn" onClick={() => onJump(j.id)}>
            <span>{j.emoji}</span> {j.label}
          </button>
        ))}
      </div>
      <div className="jump-zoom">
        <button className="zoom-btn" onClick={() => onZoom(-0.8)} title="缩小视野">
          ➖
        </button>
        <span className="zoom-label">视野 {halfRange.toFixed(1)} 个数量级</span>
        <button className="zoom-btn" onClick={() => onZoom(0.8)} title="放大视野">
          ➕
        </button>
      </div>
    </footer>
  )
}
