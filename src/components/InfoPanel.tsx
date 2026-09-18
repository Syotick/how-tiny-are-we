import type { ScaleObject, CategoryMeta } from '../types'
import { sciNotation, formatReadable, humanCompare, toSuperscript } from '../lib/format'

interface InfoPanelProps {
  object: ScaleObject | null
  categories: Record<string, CategoryMeta>
  index: number
  total: number
  onPrev: () => void
  onNext: () => void
}

export default function InfoPanel({
  object,
  categories,
  index,
  total,
  onPrev,
  onNext,
}: InfoPanelProps) {
  if (!object) {
    return (
      <aside className="info-panel">
        <div className="info-empty">
          <div style={{ fontSize: 40 }}>🔭</div>
          <p>数据加载中…</p>
        </div>
      </aside>
    )
  }

  const cat = categories[object.category]
  const log = object.size != null ? Math.log10(object.size) : null

  return (
    <aside className="info-panel">
      <div className="info-emoji">{object.emoji || cat?.emoji || '•'}</div>
      <h2 className="info-name">{object.name}</h2>
      {object.nameEn && <div className="info-name-en">{object.nameEn}</div>}

      <div className="info-badges">
        <span className="badge" style={{ background: cat?.color + '33', color: cat?.color, borderColor: cat?.color + '66' }}>
          {cat?.emoji} {cat?.label || object.category}
        </span>
        {object.auto && (
          <span className="badge auto">
            Wikidata 自动收录
          </span>
        )}
      </div>

      {object.size != null ? (
        <div className="info-size">
          <div className="info-size-main">{formatReadable(object.size)}</div>
          <div className="info-size-sub">
            {sciNotation(object.size)} · 10{toSuperscript(log!.toFixed(1))}
          </div>
          <div className="info-size-human">{humanCompare(object.size)}</div>
        </div>
      ) : (
        <div className="info-size">
          <div className="info-size-main">∞ 米</div>
          <div className="info-size-sub">大小可能无限，无法给出有限数值</div>
        </div>
      )}

      {object.sizeNote && <div className="info-note">📏 {object.sizeNote}</div>}

      <p className="info-desc">{object.description || '（暂无简介——欢迎为本条目补充中文科普文案，见 README 贡献指南）'}</p>

      {object.source && (
        <a className="info-source" href={object.source} target="_blank" rel="noreferrer">
          🔗 数据来源（CC0/CC BY-SA）
        </a>
      )}

      <div className="info-nav">
        <button className="btn" onClick={onPrev} disabled={index <= 0}>
          ← 更小
        </button>
        <span className="info-nav-count">
          {index + 1} / {total}
        </span>
        <button className="btn" onClick={onNext} disabled={index >= total - 1}>
          更大 →
        </button>
      </div>
    </aside>
  )
}
