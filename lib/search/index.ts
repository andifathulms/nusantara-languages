/**
 * Search over the languoid index. Pure, and small enough to run on every keystroke over all
 * 726 languages without a worker or an index structure.
 *
 * Matches on name, alternate names, glottocode and ISO code — the four things a reader might
 * actually have in hand. Ranking puts an exact code first, then a name that starts with the
 * query, then a name that contains it, then an alternate name: someone typing "bali" wants
 * Balinese before Baliledu-Buawa, and someone pasting "ban" wants the ISO match.
 */

export type SearchEntry = {
  readonly glottocode: string
  readonly name: string
  readonly altNames: readonly string[]
  readonly iso639P3: string | null
  /** Shown beside the result so two similar names can be told apart. */
  readonly familyName: string
  readonly hasPolygon: boolean
}

export type SearchResult = {
  readonly entry: SearchEntry
  /** Lower sorts first. */
  readonly rank: number
  /** Which field matched, for the result list to show why. */
  readonly matched: 'glottocode' | 'iso' | 'name' | 'altName'
  readonly matchedText: string
}

function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

const GLOTTOCODE = /^[a-z0-9]{4}\d{4}$/

export function searchLanguages(
  entries: readonly SearchEntry[],
  query: string,
  limit = 12,
): readonly SearchResult[] {
  const needle = fold(query)
  if (needle.length < 2) return []

  const results: SearchResult[] = []

  for (const entry of entries) {
    const name = fold(entry.name)
    const code = fold(entry.glottocode)
    const iso = entry.iso639P3 === null ? '' : fold(entry.iso639P3)

    if (GLOTTOCODE.test(needle) && code === needle) {
      results.push({ entry, rank: 0, matched: 'glottocode', matchedText: entry.glottocode })
      continue
    }
    if (iso !== '' && iso === needle) {
      results.push({ entry, rank: 1, matched: 'iso', matchedText: entry.iso639P3 ?? '' })
      continue
    }
    if (name === needle) {
      results.push({ entry, rank: 2, matched: 'name', matchedText: entry.name })
      continue
    }
    if (name.startsWith(needle)) {
      results.push({ entry, rank: 3, matched: 'name', matchedText: entry.name })
      continue
    }
    if (code.startsWith(needle)) {
      results.push({ entry, rank: 4, matched: 'glottocode', matchedText: entry.glottocode })
      continue
    }
    if (name.includes(needle)) {
      results.push({ entry, rank: 5, matched: 'name', matchedText: entry.name })
      continue
    }
    const alternate = entry.altNames.find((candidate) => fold(candidate).includes(needle))
    if (alternate !== undefined) {
      results.push({
        entry,
        rank: fold(alternate).startsWith(needle) ? 6 : 7,
        matched: 'altName',
        matchedText: alternate,
      })
    }
  }

  // Within a rank, the shorter name wins: the query covers more of it, so it is the closer
  // match. "bali" gives Balinese before Baliledu-Buawa, where alphabetical order would not.
  // Then name, then glottocode, so the same query always produces the same order.
  results.sort(
    (left, right) =>
      left.rank - right.rank ||
      left.entry.name.length - right.entry.name.length ||
      left.entry.name.localeCompare(right.entry.name) ||
      left.entry.glottocode.localeCompare(right.entry.glottocode),
  )

  return results.slice(0, limit)
}
