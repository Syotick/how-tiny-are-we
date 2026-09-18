import type { DataBundle } from '../types'

let cache: DataBundle | null = null

export async function loadData(): Promise<DataBundle> {
  if (cache) return cache
  const base = import.meta.env.BASE_URL || './'
  const res = await fetch(`${base}data/objects.json`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`加载数据失败: HTTP ${res.status}`)
  cache = (await res.json()) as DataBundle
  return cache
}
