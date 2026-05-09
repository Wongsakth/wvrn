// src/lib/search.ts
// Smart search — Thai↔English, fuzzy, aliases

// ─── Thai → English common mappings ──────────────────────────
const TH_EN_MAP: Record<string, string[]> = {
  // วงดนตรี
  'บอดี้สแลม': ['Bodyslam', 'Body Slam'],
  'บอดี้':     ['Bodyslam'],
  'สล็อต':     ['Slot Machine'],
  'สล็อตแมชชีน': ['Slot Machine'],
  'โมเดิร์นด็อก': ['Modern Dog'],
  'โมเดิร์น':  ['Modern Dog'],
  'คาราบาว':   ['Carabao'],
  'โลโซ':      ['Loso'],
  'บิ๊กแอส':   ['Big Ass'],
  'แทททู':     ['Tattoo Colour'],
  'โพลีแคท':   ['Polycat'],
  'เดอะทอยส์': ['The Toys'],
  'สครับ':     ['Scrubb'],
  'มิลลิ':     ['MILLI'],
  'พอส':       ['PAUSE'],
  'เบดรูม':    ['Bedroom Audio'],
  // ศิลปินเดี่ยว
  'ภูมิ':      ['Phum Viphurit'],
  'เจฟ':       ['Jeff Satur'],
  'แบมแบม':    ['BamBam'],
  'บาว':       ['BOWKYLION'],
  'เอฟฮีโร่':  ['F.HERO'],
  // แนวเพลง
  'ร็อค':      ['rock'],
  'ป็อป':      ['pop'],
  'อินดี้':    ['indie'],
  'ฮิปฮอป':   ['hiphop', 'hip-hop'],
  'แจ๊ส':     ['jazz'],
  'โฟล์ค':    ['folk'],
  // ประเภทงาน
  'คอนเสิร์ต':  ['concert'],
  'เทศกาล':    ['festival'],
  'แฟนมีต':    ['fan meeting'],
  'โชว์เคส':   ['showcase'],
  'อะคูสติก':  ['acoustic'],
}

// ─── English → Thai ───────────────────────────────────────────
const EN_TH_MAP: Record<string, string[]> = {
  'bodyslam':  ['บอดี้สแลม', 'บอดี้'],
  'slot':      ['สล็อต', 'สล็อตแมชชีน'],
  'modern dog':['โมเดิร์นด็อก'],
  'carabao':   ['คาราบาว'],
  'loso':      ['โลโซ'],
  'big ass':   ['บิ๊กแอส'],
  'tattoo':    ['แทททู'],
  'polycat':   ['โพลีแคท'],
  'toys':      ['เดอะทอยส์'],
  'scrubb':    ['สครับ'],
  'milli':     ['มิลลิ'],
  'pause':     ['พอส', 'วงพอส'],
  'bedroom':   ['เบดรูม', 'ห้องนอน'],
  'phum':      ['ภูมิ', 'ภูมิ วิภูริต'],
  'jeff':      ['เจฟ'],
  'bambam':    ['แบมแบม'],
  'bowkylion': ['บาว', 'บาวกีไลออน'],
  'fhero':     ['เอฟฮีโร่'],
  'f.hero':    ['เอฟฮีโร่'],
}

// ─── Normalize text ───────────────────────────────────────────
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\u0E00-\u0E7Fa-z0-9\s]/g, '') // keep Thai + latin + numbers
}

// ─── Expand query to variants ─────────────────────────────────
export function expandQuery(query: string): string[] {
  const norm = normalizeSearch(query)
  const variants = new Set<string>([norm])

  // Thai → English
  for (const [th, ens] of Object.entries(TH_EN_MAP)) {
    if (norm.includes(normalizeSearch(th))) {
      ens.forEach(en => variants.add(normalizeSearch(en)))
    }
  }

  // English → Thai
  for (const [en, ths] of Object.entries(EN_TH_MAP)) {
    if (norm.includes(en)) {
      ths.forEach(th => variants.add(normalizeSearch(th)))
    }
  }

  return Array.from(variants)
}

// ─── Fuzzy score (simple Levenshtein-based) ───────────────────
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  return dp[m][n]
}

export function fuzzyScore(query: string, target: string): number {
  const q = normalizeSearch(query)
  const t = normalizeSearch(target)
  if (t.includes(q)) return 100             // exact contains
  if (q.length < 2)  return 0
  const dist = levenshtein(q, t)
  const maxLen = Math.max(q.length, t.length)
  const score = Math.round((1 - dist / maxLen) * 100)
  return score > 60 ? score : 0             // threshold 60%
}

// ─── Main search function ─────────────────────────────────────
export interface SearchResult<T> {
  item:      T
  score:     number
  matchType: 'exact' | 'alias' | 'fuzzy'
}

export function smartSearch<T extends {
  name: string
  name_en?: string | null
  aliases?: string[]
}>(
  items: T[],
  query: string,
  fields: (keyof T)[] = ['name', 'name_en'] as any
): SearchResult<T>[] {
  if (!query.trim()) return items.map(item => ({ item, score: 100, matchType: 'exact' }))

  const variants = expandQuery(query)
  const results: SearchResult<T>[] = []

  for (const item of items) {
    let bestScore = 0
    let matchType: SearchResult<T>['matchType'] = 'fuzzy'

    for (const variant of variants) {
      // Check each field
      for (const field of fields) {
        const val = normalizeSearch(String(item[field] ?? ''))
        if (!val) continue

        if (val.includes(variant)) {
          const score = variant === normalizeSearch(query) ? 100 : 90
          if (score > bestScore) { bestScore = score; matchType = variant === normalizeSearch(query) ? 'exact' : 'alias' }
        } else {
          const fz = fuzzyScore(variant, val)
          if (fz > bestScore) { bestScore = fz; matchType = 'fuzzy' }
        }
      }

      // Check aliases array if present
      if (item.aliases) {
        for (const alias of item.aliases) {
          const a = normalizeSearch(alias)
          if (a.includes(variant)) {
            if (90 > bestScore) { bestScore = 90; matchType = 'alias' }
          }
        }
      }
    }

    if (bestScore > 0) {
      results.push({ item, score: bestScore, matchType })
    }
  }

  return results.sort((a, b) => b.score - a.score)
}

// ─── Highlight matching text ──────────────────────────────────
export function highlightMatch(text: string, query: string): string {
  if (!query.trim() || !text) return text
  const variants = expandQuery(query)
  let result = text
  for (const v of variants) {
    if (!v) continue
    const regex = new RegExp(`(${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    result = result.replace(regex, '<mark>$1</mark>')
  }
  return result
}

// ─── Suggest corrections ──────────────────────────────────────
export function suggestQuery(query: string): string | null {
  const norm = normalizeSearch(query)

  // Common typos / suggestions
  const suggestions: Record<string, string> = {
    'bodislam':    'Bodyslam',
    'bodysam':     'Bodyslam',
    'slotmachine': 'Slot Machine',
    'moderndog':   'Modern Dog',
    'tatoocolour': 'Tattoo Colour',
    'pollycat':    'Polycat',
    'scrub':       'Scrubb',
    'mili':        'MILLI',
    'bamband':     'BamBam',
  }

  return suggestions[norm] ?? null
}
