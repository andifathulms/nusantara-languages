import Link from 'next/link'
import type { SeamReport } from '@/lib/plate/seam'
import { format, localePath, type Dictionary, type Locale } from '@/lib/i18n'

/**
 * The seam, enumerated under the map that draws it.
 *
 * The guided view shows two colour regions meeting and asks the reader to believe in a
 * boundary. This is the same claim made auditable: the specific pairs of recorded areas that
 * actually touch. Reading the list is what turns "there is a seam" into "the seam is 67
 * contacts among 74 languages, and on Halmahera the two families are interleaved rather than
 * separated" — which is what PRD §4 says about boundaries being gradients, finally shown
 * rather than asserted while the colours suggest otherwise.
 *
 * Grouped by the Papuan family rather than sorted by distance, because "which families meet
 * Austronesian, and where" is the question; a flat list ranked by an incidental few hundred
 * metres would imply the distances mean something they do not.
 *
 * The two limits ride with the numbers rather than sitting in a method page: the threshold,
 * because a count without its rule is untraceable, and the floor, because only languages with a
 * polygon can appear and 42% of the bundle has none.
 *
 * A server component: the report is computed at build time and handed down.
 */
export function SeamContacts({
  report,
  strings,
  locale,
  pointOnly,
}: {
  readonly report: SeamReport
  readonly strings: Dictionary
  readonly locale: Locale
  /** Languages with no polygon, for the sentence that says why this is a floor. */
  readonly pointOnly: number
}) {
  const copy = strings.guided.seamContacts

  // Grouped once here, from an already-sorted list, so the grouping cannot reorder anything.
  const groups: { familyGlottocode: string; familyName: string; rows: SeamReport['contacts'] }[] =
    []
  for (const contact of report.contacts) {
    const last = groups[groups.length - 1]
    if (last !== undefined && last.familyGlottocode === contact.other.familyGlottocode) {
      last.rows = [...last.rows, contact]
    } else {
      groups.push({
        familyGlottocode: contact.other.familyGlottocode,
        familyName: contact.other.familyName,
        rows: [contact],
      })
    }
  }

  return (
    <section aria-labelledby="seam-contacts" className="max-w-prose">
      <h2 id="seam-contacts" className="font-display text-title-m">
        {copy.title}
      </h2>
      <p className="mt-3 text-ink-soft">
        {format(copy.lead, {
          count: report.contacts.length,
          languages: report.languageCount,
          families: report.familyCount,
        })}
      </p>

      <ul className="mt-6 space-y-5">
        {groups.map((group) => (
          <li key={group.familyGlottocode}>
            <h3 className="index-label">{group.familyName}</h3>
            <ul className="mt-2 space-y-1">
              {group.rows.map((contact) => (
                <li
                  key={`${contact.other.glottocode}-${contact.austronesian.glottocode}`}
                  className="flex flex-wrap items-baseline gap-x-2 text-body-s"
                >
                  <Link
                    href={localePath(locale, `bahasa/${contact.other.glottocode}`)}
                    className="link"
                  >
                    {contact.other.name}
                  </Link>
                  <span aria-hidden="true" className="text-ink-soft">
                    ·
                  </span>
                  <Link
                    href={localePath(locale, `bahasa/${contact.austronesian.glottocode}`)}
                    className="link"
                  >
                    {contact.austronesian.name}
                  </Link>
                  <span className="figure text-micro text-ink-soft">
                    {contact.km === 0
                      ? copy.touching
                      : format(copy.within, { km: contact.km.toFixed(1) })}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      {/* The rule and the limit, in one block rather than two stacked rules — they are a
          single statement about what this count is and is not. */}
      <div className="caveat mt-6 space-y-2">
        <p>{format(copy.threshold, { km: report.maxKm })}</p>
        <p>{format(copy.floor, { pointOnly })}</p>
      </div>
    </section>
  )
}
