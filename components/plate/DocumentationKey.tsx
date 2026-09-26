import { MED_LEVELS, type Coverage, type MedLevel } from '@/lib/bundle/types'
import type { Dictionary, Locale } from '@/lib/i18n'

/** Glottolog's MED label, in the reader's language. */
export function medLabel(strings: Dictionary, level: MedLevel | null): string {
  switch (level) {
    case 'long grammar':
      return strings.docs.longGrammar
    case 'grammar':
      return strings.docs.grammar
    case 'grammar sketch':
      return strings.docs.grammarSketch
    case 'phonology/text':
      return strings.docs.phonologyText
    case 'wordlist or less':
      return strings.docs.wordlist
    case null:
      return strings.docs.none
    default: {
      const exhaustive: never = level
      return exhaustive
    }
  }
}

/**
 * The key for the documentation mode. Shown only in that mode, because in it colour stops meaning
 * family — and the first thing the key says is exactly that. Counts are read from coverage.json.
 */
export function DocumentationKey({
  coverage,
  strings,
  locale,
}: {
  readonly coverage: Coverage
  readonly strings: Dictionary
  readonly locale: Locale
}) {
  const count = (level: MedLevel) => coverage.med.find((entry) => entry.level === level)?.count ?? 0
  return (
    <section aria-labelledby="documentation-key" className="sheet-quiet p-4 sm:p-5">
      <h2 id="documentation-key" className="index-label">
        {strings.docs.keyTitle}
      </h2>
      <p className="mt-2 max-w-prose text-body-s text-ink-soft">{strings.docs.keyNote}</p>
      <ol className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2 xl:grid-cols-3">
        {MED_LEVELS.map((level, step) => (
          <li key={level} className="flex items-baseline gap-2 text-body-s">
            <span
              aria-hidden="true"
              className="inline-block h-3 w-5 shrink-0 translate-y-[0.1em] border border-boundary/30"
              style={{ backgroundColor: `var(--doc-${step})` }}
            />
            <span className="min-w-0 flex-1">{medLabel(strings, level)}</span>
            <span className="figure text-micro text-ink-soft">{count(level).toLocaleString(locale)}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
