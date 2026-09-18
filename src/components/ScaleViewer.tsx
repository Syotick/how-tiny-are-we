import { useEffect, useRef } from 'react'
import type { ScaleObject } from '../types'
import { logOf } from '../lib/format'

interface ScaleViewerProps {
  objects: ScaleObject[]
  categories: Record<string, { label: string; color: string; emoji: string }>
  /** 目标中心尺度（log10 米） */
  pos: number
  /** 半视窗跨度（decades），默认 4.2 */
  halfRange: number
  /** 底部/顶部边界（log10 米） */
  bottomLog: number
  topLog: number
  current: ScaleObject | null
  selectedId: string | null
  onMove: (newPos: number) => void
  onJump: (log: number) => void
  onSelect: (o: ScaleObject | null) => void
}

interface Star {
  x: number
  y: number
  r: number
  a: number
  tw: number
}

function makeStars(count: number, w: number, h: number, seed = 42): Star[] {
  let s = seed
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
  const stars: Star[] = []
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rnd() * w,
      y: rnd() * h,
      r: 0.4 + rnd() * 1.4,
      a: 0.15 + rnd() * 0.6,
      tw: 1 + rnd() * 2,
    })
  }
  return stars
}

const LABEL_SHOW_DECADES = 1.7 // 与中心的尺度距离，超过则不显示文字标签

export default function ScaleViewer({
  objects,
  categories,
  pos,
  halfRange,
  bottomLog,
  topLog,
  current,
  selectedId,
  onMove,
  onJump,
  onSelect,
}: ScaleViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const posRef = useRef(pos)
  const curRef = useRef(current)
  const objectsRef = useRef(objects)
  const halfRef = useRef(halfRange)
  const bottomRef = useRef(bottomLog)
  const topRef = useRef(topLog)
  const selectedRef = useRef(selectedId)

  useEffect(() => {
    posRef.current = pos
  }, [pos])
  useEffect(() => {
    curRef.current = current
  }, [current])
  useEffect(() => {
    objectsRef.current = objects
  }, [objects])
  useEffect(() => {
    halfRef.current = halfRange
  }, [halfRange])
  useEffect(() => {
    bottomRef.current = bottomLog
    topRef.current = topLog
  }, [bottomLog, topLog])
  useEffect(() => {
    selectedRef.current = selectedId
  }, [selectedId])

  useEffect(() => {
    const canvas = canvasRef.current!
    const wrap = wrapRef.current!
    const ctx = canvas.getContext('2d')!

    let raf = 0
    let stars: Star[] = []

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      canvas.width = Math.max(1, Math.round(w * dpr))
      canvas.height = Math.max(1, Math.round(h * dpr))
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      stars = makeStars(220, w, h)
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = (t: number) => {
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      const p = posRef.current
      const half = halfRef.current
      const pxPerDec = h / (2 * half)
      const cy = h / 2

      // 背景
      const g = ctx.createLinearGradient(0, 0, 0, h)
      g.addColorStop(0, '#0b1026')
      g.addColorStop(0.5, '#0a0f20')
      g.addColorStop(1, '#060a18')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)

      // 星场
      for (const st of stars) {
        const alpha = st.a * (0.7 + 0.3 * Math.sin(t / 1000 + st.tw * 7))
        ctx.globalAlpha = alpha
        ctx.fillStyle = '#dbe4ff'
        ctx.beginPath()
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1

      // 十年刻度线
      ctx.textAlign = 'left'
      ctx.font = '11px "JetBrains Mono", Consolas, monospace'
      const firstDec = Math.floor(p - half)
      const lastDec = Math.ceil(p + half)
      for (let n = firstDec; n <= lastDec; n++) {
        const y = cy + (n - p) * pxPerDec
        if (y < 0 || y > h) continue
        const major = n % 5 === 0
        ctx.strokeStyle = major ? 'rgba(160,180,255,0.16)' : 'rgba(120,140,220,0.07)'
        ctx.lineWidth = major ? 1 : 1
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
        if (major) {
          ctx.fillStyle = 'rgba(170,190,255,0.55)'
          ctx.fillText(`10^${n}`, w - 74, y - 6)
        }
      }

      // 对象
      const objs = objectsRef.current
      const cur = curRef.current
      const labelYs: number[] = []
      for (const o of objs) {
        const log = logOf(o.size, topRef.current)
        const y = cy + (log - p) * pxPerDec
        if (y < -30 || y > h + 30) continue
        const cat = categories[o.category]
        const color = cat?.color || '#9fb4ff'
        const isCur = cur && cur.id === o.id
        const isSel = selectedRef.current === o.id
        const d = Math.abs(log - p)
        const near = d < LABEL_SHOW_DECADES
        const dotR = isCur ? 7 : isSel ? 6 : o.featured ? 4.5 : 2.6

        ctx.globalAlpha = isCur ? 1 : 0.45 + 0.4 * Math.max(0, 1 - d / 3)
        ctx.fillStyle = color
        ctx.shadowColor = color
        ctx.shadowBlur = isCur ? 24 : 10
        ctx.beginPath()
        ctx.arc(w / 2 + (isCur ? 0 : (o.featured ? 14 : 26)), y, dotR, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0

        // 当前对象光环
        if (isCur) {
          ctx.strokeStyle = color
          ctx.lineWidth = 1.5
          ctx.globalAlpha = 0.9
          const pulse = 4 + 3 * Math.sin(t / 350)
          ctx.beginPath()
          ctx.arc(w / 2, y, 13 + pulse, 0, Math.PI * 2)
          ctx.stroke()
          // emoji
          ctx.font = '22px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(o.emoji || cat?.emoji || '•', w / 2, y + 8)
        }

        // 标签（靠近中心的物体）
        if (near && !isCur) {
          const labelY = y
          const collide = labelYs.some((ly) => Math.abs(ly - labelY) < 26)
          if (!collide) {
            labelYs.push(labelY)
            ctx.font = '12px "PingFang SC", "Microsoft YaHei", sans-serif'
            ctx.textAlign = 'left'
            ctx.fillStyle = 'rgba(220,230,255,0.85)'
            ctx.fillText(`${o.emoji || cat?.emoji || '•'} ${o.name}`, w / 2 + 38, y + 4)
          }
        }
        ctx.globalAlpha = 1
      }

      // 中心线
      ctx.strokeStyle = 'rgba(255,255,255,0.28)'
      ctx.setLineDash([6, 6])
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, cy)
      ctx.lineTo(w, cy)
      ctx.stroke()
      ctx.setLineDash([])

      // 当前尺度指示
      ctx.textAlign = 'right'
      ctx.font = '13px "JetBrains Mono", Consolas, monospace'
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      const showLog = Math.round(p * 100) / 100
      ctx.fillText(`10^${showLog} m`, w - 14, cy - 10)
      ctx.font = '11px "PingFang SC", "Microsoft YaHei", sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.textAlign = 'left'
      ctx.fillText(`当前中心尺度（${objectsRef.current.length} 个物体）`, 14, h - 14)

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [categories])

  // 交互：滚轮
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const step = halfRange / 40
    const dir = e.deltaY > 0 ? 1 : -1 // 向下滚 = 变大
    onMove(clamp(pos + dir * step))
  }

  const clamp = (x: number) => Math.min(topLog, Math.max(bottomLog, x))

  // 点击：命中最近的物体
  const onClick = (e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const cy = rect.height / 2
    const y = e.clientY - rect.top
    const half = halfRange
    const pxPerDec = rect.height / (2 * half)
    let best: ScaleObject | null = null
    let bestDist = 22 // px 命中半径
    for (const o of objectsRef.current) {
      const ol = logOf(o.size, topRef.current)
      const oy = cy + (ol - pos) * pxPerDec
      const d = Math.abs(y - oy)
      if (d < bestDist) {
        bestDist = d
        best = o
      }
    }
    onSelect(best)
    if (best) onJump(logOf(best.size, topLog))
  }

  // 触摸：拖拽移动 + 双指缩放
  const touchRef = useRef<{
    x: number
    y: number
    dist: number
    baseHalf: number
    lastPos: number
  } | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        dist: 0,
        baseHalf: halfRange,
        lastPos: pos,
      }
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      touchRef.current = { x: 0, y: 0, dist, baseHalf: halfRange, lastPos: pos }
    }
  }
  const onTouchMove = (e: React.TouchEvent) => {
    const t = touchRef.current
    if (!t) return
    e.preventDefault()
    const h = wrapRef.current!.clientHeight
    const pxPerDec = h / (2 * halfRange)
    if (e.touches.length === 1 && t.dist === 0) {
      const dy = e.touches[0].clientY - t.y
      // 上滑 = 变小
      const next = clamp(t.lastPos - dy / pxPerDec)
      onMove(next)
      t.lastPos = next
      t.x = e.touches[0].clientX
      t.y = e.touches[0].clientY
    } else if (e.touches.length === 2 && t.dist > 0) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const ratio = t.dist / Math.max(1, dist)
      const next = clamp(t.lastPos + Math.log(ratio) / Math.LN10) // 捏合拉大 = 变小
      onMove(next)
      t.lastPos = next
      t.dist = dist
    }
  }
  const onTouchEnd = () => {
    touchRef.current = null
  }

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden', touchAction: 'none' }}
    >
      <canvas
        ref={canvasRef}
        onWheel={onWheel}
        onClick={onClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ display: 'block', cursor: 'pointer' }}
      />
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 10,
          pointerEvents: 'none',
          fontSize: 12,
          color: 'rgba(255,255,255,0.55)',
          background: 'rgba(0,0,0,0.35)',
          padding: '4px 8px',
          borderRadius: 6,
        }}
      >
        滚轮/拖拽移动 · 向下滚 = 更大（宇宙） · 向上滚 = 更小（粒子）
      </div>
    </div>
  )
}
