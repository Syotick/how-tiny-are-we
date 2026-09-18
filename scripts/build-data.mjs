#!/usr/bin/env node
/**
 * build-data.mjs —— 合并「人工精选」与「Wikidata 自动收录」数据，生成站点加载的 objects.json
 *
 * 用法：node scripts/build-data.mjs
 * 输入：data/categories.json, data/curated.json, data/.cache/wikidata-raw.json（可选）
 * 输出：public/data/objects.json
 */
import { writeFile, mkdir, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const CACHE = path.join(ROOT, 'data', '.cache', 'wikidata-raw.json')
const OUT = path.join(ROOT, 'public', 'data', 'objects.json')

const HUMAN_SIZE = 1.7 // 人类平均身高，作为基准锚点
const MAX_AUTO_PER_CATEGORY = 100 // 每个类别的自动条目上限
const MAX_AUTO_TOTAL = 1500

const readJson = async (p, fallback) => {
  try {
    if (!existsSync(p)) return fallback
    return JSON.parse(await readFile(p, 'utf8'))
  } catch (e) {
    console.warn(`[build-data] 读取 ${p} 失败: ${e.message}，使用 fallback`)
    return fallback
  }
}

function slugify(s) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'x'
  )
}

async function main() {
  const categories = await readJson(path.join(ROOT, 'data', 'categories.json'), {})
  const curated = (await readJson(path.join(ROOT, 'data', 'curated.json'), { objects: [] })).objects
  const autoRaw = await readJson(CACHE, [])

  // 1. 归一化精选条目
  const curatedMap = new Map()
  for (const o of curated) {
    curatedMap.set(o.id, { ...o })
  }

  // 2. 归一化自动条目
  //    a) 按（类别, 属性）分组算中位数对数尺度（用于挑最典型的值 + 离群值过滤）
  const groups = {}
  for (const o of autoRaw) {
    const key = `${o.category}:${o.prop || ''}`
    ;(groups[key] ||= []).push(Math.log10(o.size))
  }
  const medians = {}
  for (const [key, logs] of Object.entries(groups)) {
    logs.sort((a, b) => a - b)
    medians[key] = logs[Math.floor(logs.length / 2)]
  }
  //    b) 每个条目取“最接近组中位数”的那条语句，并过滤离群值
  const OUTLIER_DECADES = 4.0 // 与同组中位数相差超过 4 个数量级 → 判为脏数据
  const byItem = new Map()
  for (const o of autoRaw) {
    const key = `${o.category}:${o.prop || ''}`
    const med = medians[key]
    if (med == null || Math.abs(Math.log10(o.size) - med) > OUTLIER_DECADES) continue
    const cur = byItem.get(o.id)
    if (!cur || Math.abs(Math.log10(o.size) - med) < Math.abs(Math.log10(cur.size) - med)) {
      byItem.set(o.id, o)
    }
  }
  //    c) 按类别限流（优先有中文描述的条目）、跳过与精选重复的
  const autoByCat = {}
  const autoList = [...byItem.values()]
  // 有中文描述的优先，其次按条目 id 稳定排序
  autoList.sort((a, b) => {
    if (!!a.description !== !!b.description) return a.description ? -1 : 1
    return a.id < b.id ? -1 : 1
  })
  for (const o of autoList) {
    if (!autoByCat[o.category]) autoByCat[o.category] = []
    if (autoByCat[o.category].length < MAX_AUTO_PER_CATEGORY) autoByCat[o.category].push(o)
  }
  const usedNames = new Set(curated.map((o) => o.nameEn || o.name))
  const autoItems = []
  for (const [cat, items] of Object.entries(autoByCat)) {
    for (const o of items) {
      const key = o.nameEn || o.name
      if (usedNames.has(key)) continue // 精选优先，避免重复
      usedNames.add(key)
      autoItems.push({
        id: `auto-${o.id}`,
        name: o.name,
        nameEn: o.nameEn || '',
        category: o.category,
        size: o.size,
        sizeNote: `${o.size.toExponential(2)} m（Wikidata）`,
        description: o.description || '',
        emoji: '',
        source: o.source,
        wikidataId: o.wikidataId,
        auto: true,
      })
      if (autoItems.length >= MAX_AUTO_TOTAL) break
    }
    if (autoItems.length >= MAX_AUTO_TOTAL) break
  }

  // 3. 合并、排序（size 为 null 的放最顶端，表示无穷）
  const objects = [...curatedMap.values(), ...autoItems].sort((a, b) => {
    const la = a.size == null ? Infinity : Math.log10(a.size)
    const lb = b.size == null ? Infinity : Math.log10(b.size)
    return la - lb
  })

  // 4. 计算尺度范围
  const logs = objects.filter((o) => o.size != null).map((o) => Math.log10(o.size))
  const minLog = Math.floor(Math.min(...logs)) - 0.5
  const maxLog = Math.ceil(Math.max(...logs)) + 0.5

  const byId = (id) => objects.find((o) => o.id === id)

  const meta = {
    version: 1,
    builtAt: new Date().toISOString(),
    humanReferenceSize: HUMAN_SIZE,
    minLog,
    maxLog,
    curatedCount: curated.length,
    autoCount: autoItems.length,
    total: objects.length,
    jumps: ['planck-length', 'human', 'earth', 'sun', 'milky-way', 'observable-universe']
      .map((id) => byId(id))
      .filter(Boolean)
      .map((o) => ({ id: o.id, label: o.name, emoji: o.emoji })),
  }

  const payload = { meta, categories, objects }
  await mkdir(path.dirname(OUT), { recursive: true })
  await writeFile(OUT, JSON.stringify(payload), 'utf8')
  console.log(
    `[build-data] 精选 ${curated.length} + 自动 ${autoItems.length} = ${objects.length} 条 → ${OUT}`
  )
  console.log(`[build-data] 尺度范围 10^${minLog} ~ 10^${maxLog} 米`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
