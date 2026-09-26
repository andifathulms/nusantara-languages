/**
 * One concept of the word map, prepared for the page. Pure.
 *
 * Everything the page shows about a word is derived here from the bundle at build time — which
 * languages are lit, how many have a form at all, and a strip of examples — so the component only
 * switches between prepared views and cannot compute a figure of its own.
 */

import type { Languoid, WordLayer } from '../bundle/types'

export type WordNote = { readonly form: string; readonly inSet: boolean; readonly loan: boolean }

export type WordView = {
  readonly id: string
  readonly gloss: string
  /** Languages whose form is in the widest cognate set: what the plate lights. */
  readonly lit: readonly string[]
  /** Languages on the map with any form for this concept. */
  readonly withForm: number
  /** A spread of examples, west to east: the argument, in words, in one line. */
  readonly samples: readonly { readonly glottocode: string; readonly name: string; readonly form: string; readonly inSet: boolean }[]
  /** Glottocode → the word, for the hover label. */
  readonly notes: Readonly<Record<string, WordNote>>
}

export function wordView(
  concept: WordLayer['concepts'][number],
  languoids: readonly Languoid[],
  sampleCount = 10,
): WordView {
  const byCode = new Map(languoids.map((languoid) => [languoid.glottocode, languoid]))
  const entries = Object.entries(concept.forms)
    .flatMap(([code, entry]) => {
      const languoid = byCode.get(code)
      return languoid === undefined ? [] : [{ code, entry, languoid }]
    })
    .sort((a, b) => a.languoid.lon - b.languoid.lon || a.code.localeCompare(b.code))

  const inSet = (cognate: string | null) => cognate !== null && cognate === concept.widest
  const lit = entries.filter(({ entry }) => inSet(entry.cognate)).map(({ code }) => code)

  // Evenly spaced along the west-to-east order, so Sumatra and Papua both appear.
  const step = entries.length / Math.max(1, sampleCount)
  const samples = Array.from({ length: Math.min(sampleCount, entries.length) }, (_, index) => {
    const picked = entries[Math.floor(index * step)]
    if (picked === undefined) throw new Error('sample out of range')
    return {
      glottocode: picked.code,
      name: picked.languoid.name,
      form: picked.entry.form,
      inSet: inSet(picked.entry.cognate),
    }
  })

  const notes: Record<string, WordNote> = {}
  for (const { code, entry } of entries) {
    notes[code] = { form: entry.form, inSet: inSet(entry.cognate), loan: entry.loan }
  }

  return {
    id: concept.id,
    gloss: concept.gloss,
    lit: [...lit].sort(),
    withForm: entries.length,
    samples,
    notes,
  }
}
