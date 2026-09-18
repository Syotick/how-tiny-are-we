#!/usr/bin/env node
/**
 * fetch-wikidata.mjs —— 从 Wikidata 批量抓取物体尺寸数据（自动扩充层）
 *
 * 原理：对每个类别（建筑/山脉/河流/行星/恒星/星系/病毒/小行星…），
 * 用 SPARQL 查询属于该类别实例、且带有尺寸属性（P2386 直径 / P2048 高度 / P2049 长度）
 * 的条目，把数值统一换算成“米”后输出。
 *
 * 数据许可：Wikidata 内容为 CC0（公共领域），可自由嵌入。
 *
 * 端点：
 *   - 默认 https://query.wikidata.org/sparql（GitHub Actions 海外运行器可用）
 *   - 本机在部分网络下不可达，可用镜像：WDQS_ENDPOINT=https://qlever.dev/api/wikidata
 *     （QLever 兼容本脚本的查询：psv 值节点 + wikibase:quantityAmount/quantityUnit）
 *
 * 用法：node scripts/fetch-wikidata.mjs
 * 输出：data/.cache/wikidata-raw.json
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '..', 'data', '.cache')
const OUT_FILE = path.join(OUT_DIR, 'wikidata-raw.json')
const ENDPOINT =
  process.env.WDQS_ENDPOINT || 'https://query.wikidata.org/sparql'
const LIMIT_PER_CATEGORY = Number(process.env.LIMIT_PER_CATEGORY || 400)

const PREFIXES = `
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
PREFIX wd: <http://www.wikidata.org/entity/>
PREFIX p: <http://www.wikidata.org/prop/>
PREFIX psv: <http://www.wikidata.org/prop/statement/value/>
PREFIX psn: <http://www.wikidata.org/prop/statement/value-normalized/>
PREFIX wikibase: <http://wikiba.se/ontology#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX schema: <http://schema.org/>
`.trim()

/** 关心的单位标签 → 换算成米 的倍率。运行时按标签反查 QID，避免手写 QID 出错。 */
const UNIT_FACTORS_BY_LABEL = {
  metre: 1,
  kilometre: 1e3,
  centimetre: 1e-2,
  millimetre: 1e-3,
  micrometre: 1e-6,
  nanometre: 1e-9,
  picometre: 1e-12,
  foot: 0.3048,
  inch: 0.0254,
  mile: 1609.344,
  'astronomical unit': 149597870700,
  'light-year': 9.4607304725808e15,
  parsec: 3.0856775814913673e16,
  kiloparsec: 3.0856775814913673e19,
}

/** 备用静态映射（反查失败时使用，仅覆盖已核验过的 QID） */
const UNIT_FALLBACK = {
  'http://www.wikidata.org/entity/Q11573': 1, // metre
  'http://www.wikidata.org/entity/Q828224': 1e3, // kilometre
  'http://www.wikidata.org/entity/Q531': 9.4607304725808e15, // light-year
  'http://www.wikidata.org/entity/Q12129': 3.0856775814913673e16, // parsec
  'http://www.wikidata.org/entity/Q11929860': 3.0856775814913673e19, // kiloparsec
  'http://www.wikidata.org/entity/Q3710': 0.3048, // foot
  'http://www.wikidata.org/entity/Q218593': 0.0254, // inch
  'http://www.wikidata.org/entity/Q253276': 1609.344, // mile
}

let unitMap = null

/** 动态反查单位 QID → 米倍率 */
async function resolveUnitMap() {
  if (unitMap) return unitMap
  const map = { ...UNIT_FALLBACK }
  try {
    const labels = Object.keys(UNIT_FACTORS_BY_LABEL)
      .map((l) => `"${l}"@en`)
      .join(' ')
    const q = `
${PREFIXES}
SELECT ?unit ?label WHERE {
  VALUES ?label { ${labels} }
  ?unit rdfs:label ?label .
}`
    const resp = await fetch(`${ENDPOINT}?query=${encodeURIComponent(q)}`, {
      headers: {
        'User-Agent': 'how-tiny-are-we/0.1 (open-source size encyclopedia)',
        Accept: 'application/sparql-results+json',
      },
      signal: AbortSignal.timeout(60000),
    })
    if (resp.ok) {
      const data = await resp.json()
      for (const r of data.results?.bindings || []) {
        const unit = r.unit?.value
        const label = r.label?.value
        if (unit && label && UNIT_FACTORS_BY_LABEL[label]) {
          map[unit] = UNIT_FACTORS_BY_LABEL[label]
        }
      }
    }
  } catch {
    // 反查失败则用备用映射
  }
  unitMap = map
  console.log(`[fetch-wikidata] 单位映射表：${Object.keys(unitMap).length} 个单位`)
  return unitMap
}

/**
 * 每个类别：实例白名单（P31/P279* 匹配的类 QID）+ 尺寸属性优先级。
 * P2386=直径, P2048=高度, P2049=长度, P2047=宽度
 */
const CATEGORIES = [
  { id: 'building', name: '人造建筑', instances: ['Q41176', 'Q11303', 'Q41177', 'Q811979', 'Q24398318', 'Q4991371'], properties: ['P2048', 'P2049', 'P2047'] },
  { id: 'mountain', name: '山脉山峰', instances: ['Q8502', 'Q2085004', 'Q46831'], properties: ['P2048', 'P2049'] },
  { id: 'river', name: '河流', instances: ['Q4022', 'Q355304'], properties: ['P2049', 'P2047', 'P2048'] },
  { id: 'lake', name: '湖泊', instances: ['Q23397'], properties: ['P2049', 'P2047', 'P2048'] },
  { id: 'planet', name: '行星', instances: ['Q634', 'Q3504248'], properties: ['P2386', 'P2049'] },
  { id: 'star', name: '恒星', instances: ['Q523', 'Q11315', 'Q1290018'], properties: ['P2386'] },
  { id: 'galaxy', name: '星系', instances: ['Q318'], properties: ['P2386'] },
  { id: 'asteroid', name: '小行星', instances: ['Q3863', 'Q1745269'], properties: ['P2386', 'P2049'] },
]

const SIZE_MIN_LOG = -36
const SIZE_MAX_LOG = 27.8

function buildQuery(cat) {
  const classValues = cat.instances.map((c) => `wd:${c}`).join(' ')
  // 注意：不要加 wikibase:rank 过滤——QLever 镜像对其支持不稳定（官方 WDQS 可用）
  const unionProps = cat.properties
    .map(
      (prop) =>
        `{ ?item p:${prop} ?st . ?st psv:${prop} ?vnode . ` +
        `?vnode wikibase:quantityAmount ?dim . ?vnode wikibase:quantityUnit ?unit . ` +
        `BIND("${prop}" AS ?prop) }`
    )
    .join(' UNION ')
  return `
${PREFIXES}
SELECT DISTINCT ?item ?zhLabel ?enLabel ?desc ?dim ?unit ?prop WHERE {
  VALUES ?class { ${classValues} }
  ?item wdt:P31/wdt:P279* ?class .
  { ${unionProps} }
  ?article schema:about ?item .
  ?article schema:isPartOf <https://zh.wikipedia.org/> .
  OPTIONAL { ?item rdfs:label ?zhLabel FILTER(LANG(?zhLabel) = "zh") }
  OPTIONAL { ?item rdfs:label ?enLabel FILTER(LANG(?enLabel) = "en") }
  OPTIONAL { ?item schema:description ?desc FILTER(LANG(?desc) = "zh") }
  FILTER(BOUND(?zhLabel) || BOUND(?enLabel))
}
LIMIT ${LIMIT_PER_CATEGORY}`
}

function unitToMeters(unitUri) {
  if (!unitUri) return null
  return unitMap?.[unitUri] ?? null
}

async function fetchCategory(cat) {
  const query = buildQuery(cat)
  const url = `${ENDPOINT}?query=${encodeURIComponent(query)}`
  let lastErr = null
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const resp = await fetch(url, {
        headers: {
          'User-Agent':
            'how-tiny-are-we/0.1 (open-source size encyclopedia; https://github.com/how-tiny-are-we)',
          Accept: 'application/sparql-results+json',
        },
        signal: AbortSignal.timeout(180000),
      })
      if (resp.status === 429 || resp.status >= 500) {
        const delay = 3000 * 2 ** attempt
        console.warn(`[fetch-wikidata] ${cat.id} HTTP ${resp.status}，${delay}ms 后重试…`)
        await new Promise((r) => setTimeout(r, delay))
        continue
      }
      if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`HTTP ${resp.status} for ${cat.id}: ${text.slice(0, 300)}`)
      }
      const data = await resp.json()
      const rows = data.results?.bindings || []
      const out = []
      for (const r of rows) {
        const qid = r.item?.value?.replace('http://www.wikidata.org/entity/', '')
        if (!qid) continue
        const dim = Number(r.dim?.value)
        const unitFactor = unitToMeters(r.unit?.value)
        if (!Number.isFinite(dim) || dim <= 0 || !unitFactor) continue
        const size = dim * unitFactor
        const log = Math.log10(size)
        if (log < SIZE_MIN_LOG || log > SIZE_MAX_LOG) continue
        out.push({
          id: qid,
          name: r.zhLabel?.value || r.enLabel?.value || qid,
          nameEn: r.enLabel?.value || r.zhLabel?.value || '',
          zhLabel: r.zhLabel?.value || '',
          description: r.desc?.value || '',
          category: cat.id,
          prop: r.prop?.value || '',
          size,
          wikidataId: qid,
          source: `https://www.wikidata.org/wiki/${qid}`,
          auto: true,
        })
      }
      return out
    } catch (e) {
      lastErr = e
      if (e.name === 'TimeoutError') {
        const delay = 3000 * 2 ** attempt
        console.warn(`[fetch-wikidata] ${cat.id} 超时，${delay}ms 后重试…`)
        await new Promise((r) => setTimeout(r, delay))
        continue
      }
      throw e
    }
  }
  throw lastErr
}

async function main() {
  console.log(`[fetch-wikidata] endpoint = ${ENDPOINT}`)
  await resolveUnitMap()
  const all = []
  let ok = 0
  for (const cat of CATEGORIES) {
    try {
      const items = await fetchCategory(cat)
      all.push(...items)
      ok++
      console.log(`[fetch-wikidata] ${cat.name}: ${items.length} 条`)
    } catch (e) {
      console.warn(`[fetch-wikidata] 类别 ${cat.name} 抓取失败: ${e.message}`)
    }
  }
  console.log(
    `[fetch-wikidata] 成功类别 ${ok}/${CATEGORIES.length}，共 ${all.length} 条原始数据`
  )
  if (all.length === 0) {
    console.error('[fetch-wikidata] 未抓到任何数据，退出码 1（便于 CI 回退到镜像端点）')
    process.exit(1)
  }
  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true })
  await writeFile(OUT_FILE, JSON.stringify(all, null, 2), 'utf8')
  console.log(`[fetch-wikidata] 已写入 ${OUT_FILE}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
