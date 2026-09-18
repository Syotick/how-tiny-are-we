import type { CategoryMeta, ScaleObject } from '../types'
import { formatReadable } from '../lib/format'

interface TopBarProps {
  total: number
  curatedCount: number
  autoCount: number
  categories: Record<string, CategoryMeta>
  activeCats: Set<string>
  onToggleCat: (id: string) => void
  search: string
  onSearch: (s: string) => void
  matches: ScaleObject[]
  onJumpTo: (o: ScaleObject) => void
  repoUrl: string
}

export default function TopBar({
  total,
  curatedCount,
  autoCount,
  categories,
  activeCats,
  onToggleCat,
  search,
  onSearch,
  matches,
  onJumpTo,
  repoUrl,
}: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-icon">🧍</span>
        <div>
          <h1 className="brand-title">人类有多渺小</h1>
          <div className="brand-sub">
            How Tiny Are We · 以人类身高为基准的尺寸百科 · {total} 个物体（精选 {curatedCount} + Wikidata {autoCount}）
          </div>
        </div>
      </div>

      <div className="topbar-right">
        <div className="search-wrap">
          <input
            className="search-input"
            placeholder="搜索物体，如：蓝鲸 / 银河系 / proton…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
          {search.trim() && (
            <div className="search-drop">
              {matches.length === 0 && <div className="search-empty">没有匹配的物体</div>}
              {matches.slice(0, 8).map((o) => {
                const cat = categories[o.category]
                return (
                  <button key={o.id} className="search-item" onClick={() => onJumpTo(o)}>
                    <span>{o.emoji || cat?.emoji || '•'}</span>
                    <span className="search-item-name">{o.name}</span>
                    <span className="search-item-size">
                      {o.size != null ? formatReadable(o.size) : '∞'}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <a className="repo-link" href={repoUrl} target="_blank" rel="noreferrer" title="GitHub 开源仓库">
          <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
          </svg>
        </a>
      </div>

      <div className="cat-chips">
        {Object.entries(categories).map(([id, c]) => {
          const on = activeCats.has(id)
          return (
            <button
              key={id}
              className={`chip ${on ? 'on' : ''}`}
              style={on ? { background: c.color + '2e', color: c.color, borderColor: c.color + '88' } : undefined}
              onClick={() => onToggleCat(id)}
            >
              {c.emoji} {c.label}
            </button>
          )
        })}
        {activeCats.size > 0 && (
          <button className="chip clear" onClick={() => onToggleCat('__all__')}>
            ✕ 清除筛选
          </button>
        )}
      </div>
    </header>
  )
}
