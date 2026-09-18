export type CategoryId = string

export interface ScaleObject {
  id: string
  name: string
  nameEn?: string
  category: string
  /** 大小（米）。null 表示无穷大（如整个宇宙） */
  size: number | null
  sizeNote?: string
  description: string
  emoji?: string
  source?: string
  wikidataId?: string
  auto?: boolean
  featured?: boolean
}

export interface CategoryMeta {
  label: string
  en: string
  emoji: string
  color: string
}

export interface DataBundle {
  meta: {
    version: number
    builtAt: string
    humanReferenceSize: number
    minLog: number
    maxLog: number
    curatedCount: number
    autoCount: number
    total: number
    jumps: { id: string; label: string; emoji: string }[]
  }
  categories: Record<string, CategoryMeta>
  objects: ScaleObject[]
}
