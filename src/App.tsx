import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DataBundle, ScaleObject } from './types'
import { loadData } from './data/loadData'
import { logOf, HUMAN } from './lib/format'
import ScaleViewer from './components/ScaleViewer'
import Ruler from './components/Ruler'
import InfoPanel from './components/InfoPanel'
import TopBar from './components/TopBar'
import JumpBar from './components/JumpBar'

const REPO_URL = 'https://github.com/Syotick/how-tiny-are-we'

export default function App() {
  const [data, setData] = useState<DataBundle | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [pos, setPos] = useState(Math.log10(HUMAN))
  const [halfRange, setHalfRange] = useState(4.2)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeCats, setActiveCats] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadData()
      .then(setData)
      .catch((e) => setLoadErr(String(e)))
  }, [])

  const topLog = useMemo(() => (data ? data.meta.maxLog + 0.6 : 27.5), [data])
  const bottomLog = useMemo(() => (data ? data.meta.minLog - 0.6 : -36.0), [data])

  const clamp = useCallback(
    (x: number) => Math.min(topLog, Math.max(bottomLog, x)),
    [topLog, bottomLog]
  )

  const visible = useMemo(() => {
    if (!data) return []
    let list = data.objects
    if (activeCats.size > 0) list = list.filter((o) => activeCats.has(o.category))
    const q = search.trim().toLowerCase()
    if (q)
      list = list.filter((o) =>
        `${o.name} ${o.nameEn ?? ''} ${o.description}`.toLowerCase().includes(q)
      )
    return list
  }, [data, activeCats, search])

  const current = useMemo(() => {
    if (!visible.length) return null
    let best = visible[0]
    let bd = Infinity
    for (const o of visible) {
      const d = Math.abs(logOf(o.size, topLog) - pos)
      if (d < bd) {
        bd = d
        best = o
      }
    }
    return best
  }, [visible, pos, topLog])

  const shown = useMemo(() => {
    if (!selectedId) return current
    return visible.find((o) => o.id === selectedId) ?? current
  }, [selectedId, visible, current])

  const shownIndex = useMemo(
    () => (shown ? visible.findIndex((o) => o.id === shown.id) : -1),
    [shown, visible]
  )

  const moveTo = useCallback((log: number) => setPos(clamp(log)), [clamp])

  const jumpToId = useCallback(
    (id: string) => {
      const o = data?.objects.find((x) => x.id === id)
      if (o) {
        moveTo(logOf(o.size, topLog))
        setSelectedId(null)
      }
    },
    [data, moveTo, topLog]
  )

  const jumpToObject = useCallback(
    (o: ScaleObject) => {
      moveTo(logOf(o.size, topLog))
      setSelectedId(null)
    },
    [moveTo, topLog]
  )

  const navDelta = useCallback(
    (delta: number) => {
      if (!visible.length) return
      let idx = shownIndex
      if (idx < 0) idx = 0
      const ni = Math.max(0, Math.min(visible.length - 1, idx + delta))
      const o = visible[ni]
      if (o) {
        moveTo(logOf(o.size, topLog))
        setSelectedId(null)
      }
    },
    [visible, shownIndex, moveTo, topLog]
  )

  const toggleCat = useCallback((id: string) => {
    setActiveCats((prev) => {
      const next = new Set(prev)
      if (id === '__all__') next.clear()
      else if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // 键盘导航
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const step = halfRange / 18
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setPos((p) => clamp(p + step))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setPos((p) => clamp(p - step))
      } else if (e.key === 'Home') {
        e.preventDefault()
        jumpToId('planck-length')
      } else if (e.key === 'End') {
        e.preventDefault()
        jumpToId('observable-universe')
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault()
        jumpToId('human')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [halfRange, clamp, jumpToId])

  // 搜索下拉：优先前缀匹配
  const dropMatches = useMemo(() => {
    if (!search.trim()) return []
    const q = search.trim().toLowerCase()
    const scored: { o: ScaleObject; score: number }[] = []
    for (const o of visible) {
      const n = o.name.toLowerCase()
      const en = (o.nameEn || '').toLowerCase()
      let score = -1
      if (n === q) score = 0
      else if (n.startsWith(q)) score = 1
      else if (en.startsWith(q)) score = 2
      else if (n.includes(q)) score = 3
      else if (en.includes(q)) score = 4
      if (score >= 0) scored.push({ o, score })
    }
    return scored.sort((a, b) => a.score - b.score).slice(0, 8).map((s) => s.o)
  }, [search, visible])

  if (loadErr) {
    return <div className="load-error">数据加载失败：{loadErr}</div>
  }
  if (!data) {
    return (
      <div className="load-error">
        <div style={{ fontSize: 48 }}>🔭</div>
        <div>正在加载宇宙尺寸数据…</div>
      </div>
    )
  }

  return (
    <div className="app">
      <TopBar
        total={data.meta.total}
        curatedCount={data.meta.curatedCount}
        autoCount={data.meta.autoCount}
        categories={data.categories}
        activeCats={activeCats}
        onToggleCat={toggleCat}
        search={search}
        onSearch={setSearch}
        matches={dropMatches}
        onJumpTo={jumpToObject}
        repoUrl={REPO_URL}
      />
      <div className="main">
        <Ruler
          minLog={bottomLog}
          maxLog={topLog}
          pos={pos}
          humanLog={Math.log10(HUMAN)}
          onJump={moveTo}
        />
        <ScaleViewer
          objects={visible}
          categories={data.categories}
          pos={pos}
          halfRange={halfRange}
          bottomLog={bottomLog}
          topLog={topLog}
          current={current}
          selectedId={selectedId}
          onMove={moveTo}
          onJump={moveTo}
          onSelect={(o) => setSelectedId(o ? o.id : null)}
        />
        <InfoPanel
          object={shown}
          categories={data.categories}
          index={Math.max(0, shownIndex)}
          total={visible.length}
          onPrev={() => navDelta(-1)}
          onNext={() => navDelta(1)}
        />
      </div>
      <JumpBar
        jumps={data.meta.jumps}
        onJump={jumpToId}
        halfRange={halfRange}
        onZoom={(d) => setHalfRange((h) => Math.min(14, Math.max(1.6, h + d)))}
      />
    </div>
  )
}
