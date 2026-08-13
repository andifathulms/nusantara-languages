import Link from 'next/link'
import type { RelativeReport } from '@/lib/tree/relatives'
import { format, localePath, type Dictionary, type Locale } from '@/lib/i18n'

/**
 * "Who is this language's closest relative, and how far away does it live?"
 *
 * The app binds descent to geography in one direction already — pick a branch, watch its
 * territories light. This is the question that falls out of the binding and that the site could
 * not previously answer, even though both halves of it were sitting in memory.
 *
 * Three things are kept deliberately apart, because collapsing any two of them would make a
 * claim the data does not support:
 *
 * 1. The *group* — everything under the deepest shared ancestor — is genealogy, and unranked.
 *    Glottolog's classification is a nesting with no branch lengths, so nothing here can say
 *    that one of these relatives is closer kin than another.
 * 2. The *closest recorded point* is geography, and it is stated separately and labelled as
 *    such, so that nearness on the map is never read as nearness in the family.
 * 3. The *frame* — this is computed among the languages on this map only.
 *
 * A server component: pure presentation over a value computed at build time.
 */
export function NearestRelatives({
  report,
  strings,
  locale,
  total,
}: {
  /** Null for an isolate, which is the interesting answer rather than a missing one. */
  readonly report: RelativeReport | null
  readonly strings: Dictionary
  readonly locale: Locale
  /** Languages in the bundle, for the sentence that states the frame. */
  readonly total: number
}) {
  return (
    <section aria-labelledby="relatives" className="sheet-quiet p-4 sm:p-5">
      <h2 id="relatives" className="index-label">
        {strings.relatives.title}
      </h2>

      {report === null ? (
        <p className="mt-2 text-body">{strings.relatives.isolate}</p>
      ) : (
        <>
          <dl className="mt-3 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="index-label">{strings.relatives.sharedAncestor}</dt>
              <dd className="mt-1 font-display text-title-s leading-snug">
                {report.sharedAncestor.name}
              </dd>
              <dd className="figure mt-1 text-body-s text-ink-soft">
                {format(strings.relatives.count, { count: report.count })}
              </dd>
            </div>

            {report.closest === null ? null : (
              <div>
                <dt className="index-label">{strings.relatives.closest}</dt>
                <dd className="mt-1 font-display text-title-s leading-snug">
                  <Link
                    href={localePath(locale, `bahasa/${report.closest.glottocode}`)}
                    className="link"
                  >
                    {report.closest.name}
                  </Link>
                </dd>
                <dd className="figure mt-1 text-body-s text-ink-soft">
                  {format(strings.relatives.distance, {
                    // Rounded to the nearest 10 km. The inputs are midpoints of dispersed
                    // populations; printing a unit digit would dress that up as precision.
                    km: (Math.round(report.closest.km / 10) * 10).toLocaleString(locale),
                  })}
                </dd>
              </div>
            )}
          </dl>

          <p className="caveat mt-4">{strings.relatives.unranked}</p>
          {report.closest === null ? null : (
            <p className="caveat mt-2">{strings.relatives.distanceCaveat}</p>
          )}
          <p className="caveat mt-2">{format(strings.relatives.scopeCaveat, { total })}</p>
        </>
      )}
    </section>
  )
}
